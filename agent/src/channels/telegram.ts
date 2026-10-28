import { Bot } from "grammy";
import { config } from "../config.js";
import { canOffer, allowMessage } from "../guard.js";
import { chat, flushCost, type Message } from "../llm.js";
import { orders } from "../orders.js";
import { PERSONA } from "../persona.js";
import { site } from "../site.js";
import { catalog, supplierFor } from "../suppliers/registry.js";

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";
const history = new Map<number, Message[]>();
const isAdmin = (id?: number) => !!id && config.telegram.adminIds.includes(String(id));

async function offerable() {
  const items = await catalog();
  return items.filter((p) => canOffer(p, supplierFor(p.supplierId), p.priceVnd).ok !== false);
}

export function createTelegramBot(): Bot {
  const bot = new Bot(config.telegram.token);

  bot.command("start", (ctx) =>
    ctx.reply("Chào bạn, mình là Khải, vừa từ năm 2046 về. Mình đang trả món nợ 200 triệu bằng việc làm dịch vụ thật. Gõ /danhmuc để xem mình làm được gì.")
  );

  bot.command("danhmuc", async (ctx) => {
    const items = await offerable();
    if (!items.length) return ctx.reply("Danh mục đang trống, bạn quay lại sau nhé.");
    const lines = items.map((p) => `• ${p.sku}: ${p.name}${p.priceVnd ? ` (${vnd(p.priceVnd)})` : ""}\n  ${p.description}`);
    return ctx.reply(`Danh mục hôm nay:\n\n${lines.join("\n\n")}\n\nMua: /mua <mã> <mô tả yêu cầu>`);
  });

  bot.command("mua", async (ctx) => {
    const [sku, ...rest] = (ctx.match ?? "").trim().split(/\s+/);
    const brief = rest.join(" ");
    const product = (await catalog()).find((p) => p.sku === sku);
    if (!product) return ctx.reply("Mình không tìm thấy mã này. Gõ /danhmuc để xem lại.");
    const supplier = supplierFor(product.supplierId);
    const q = await supplier.quote(product.sku, 1);
    const verdict = canOffer(product, supplier, q.totalVnd);
    if (verdict.ok === false) return ctx.reply("Sản phẩm này tạm thời không bán được.");

    if (q.totalVnd === 0) {
      // Affiliate: giao link ngay, không thu tiền
      const d = await supplier.fulfill("AFF", product.sku, brief);
      return ctx.reply(d.message);
    }
    if (!brief) return ctx.reply("Bạn ghi thêm yêu cầu sau mã nhé, ví dụ: /mua content-10 shop bán bánh tráng Tây Ninh, khách trẻ.");

    const order = orders.create({
      chatId: ctx.chat.id, supplierId: supplier.id, sku: product.sku, qty: 1,
      totalVnd: q.totalVnd, costVnd: q.costVnd, brief,
      status: verdict.ok === "needs_human" ? "needs_approval" : "awaiting_payment",
    });
    for (const admin of config.telegram.adminIds) {
      await bot.api.sendMessage(admin, `Đơn mới ${order.id}: ${product.name}, ${vnd(q.totalVnd)}.\nYêu cầu: ${brief}\nXác nhận đã nhận tiền: /xacnhan ${order.id}`);
    }
    return ctx.reply(
      `Đơn ${order.id}: ${product.name}, ${vnd(q.totalVnd)}.\n` +
      `Bạn chuyển khoản theo thông tin ở mục Ủng hộ trên trang, nội dung ghi "${order.id}". ` +
      `Khi mình nhận được tiền, sản phẩm sẽ gửi ngay trong chat này.`
    );
  });

  // Chủ trang xác nhận đã nhận tiền (sau này thay bằng webhook ngân hàng như Casso hoặc PayOS).
  bot.command("xacnhan", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    const id = (ctx.match ?? "").trim();
    const order = orders.get(id);
    if (!order) return ctx.reply("Không có đơn này.");
    if (order.status === "delivered") return ctx.reply("Đơn này đã giao rồi.");
    orders.setStatus(order.id, "paid");
    await site.record("income", order.supplierId, order.totalVnd, `Đơn ${order.id} · ${order.sku}`);
    const delivery = await supplierFor(order.supplierId).fulfill(order.id, order.sku, order.brief);
    await bot.api.sendMessage(order.chatId, `Đơn ${order.id} của bạn đây:\n\n${delivery.message}`.slice(0, 4000));
    orders.setStatus(order.id, "delivered");
    await flushCost(true);
    return ctx.reply(`Đã giao đơn ${order.id} và ghi ${vnd(order.totalVnd)} vào sổ cái.`);
  });

  bot.command("hoantien", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    const [id, ...why] = (ctx.match ?? "").trim().split(/\s+/);
    const order = orders.get(id);
    if (!order) return ctx.reply("Không có đơn này.");
    await supplierFor(order.supplierId).refund(order.id, why.join(" "));
    orders.setStatus(order.id, "refunded");
    await site.record("cost", order.supplierId, order.totalVnd, `Hoàn tiền đơn ${order.id}`);
    return ctx.reply(`Đã ghi hoàn tiền đơn ${order.id}. Nhớ chuyển trả khách qua ngân hàng.`);
  });

  // Ghi khoản ủng hộ đã xác nhận: /ungho 50000 lời nhắn
  bot.command("ungho", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    const [amount, ...note] = (ctx.match ?? "").trim().split(/\s+/);
    const n = Number(amount);
    if (!Number.isInteger(n) || n <= 0) return ctx.reply("Cú pháp: /ungho <số tiền> <lời nhắn>");
    await site.record("donation", "donate", n, note.join(" ") || "Ủng hộ");
    return ctx.reply(`Đã ghi ${vnd(n)} tiền ủng hộ.`);
  });

  // Trò chuyện tự do: Khải tư vấn dựa trên danh mục đã qua lớp kiểm soát.
  bot.on("message:text", async (ctx) => {
    if (!allowMessage(String(ctx.from.id))) return;
    const items = await offerable();
    const menu = items.map((p) => `${p.sku}: ${p.name} - ${p.priceVnd ? vnd(p.priceVnd) : "miễn phí (link giới thiệu)"} - ${p.description}`).join("\n");
    const h = history.get(ctx.chat.id) ?? [];
    h.push({ role: "user", content: ctx.message.text });
    const reply = await chat([{ role: "system", content: `${PERSONA}\n\nDanh mục được phép bán:\n${menu}` }, ...h.slice(-10)]);
    h.push({ role: "assistant", content: reply });
    history.set(ctx.chat.id, h.slice(-20));
    await ctx.reply(reply);
    await flushCost();
  });

  bot.catch((err) => console.error("Lỗi bot:", err.error));
  return bot;
}
