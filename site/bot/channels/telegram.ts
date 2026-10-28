import { Bot, InlineKeyboard, Keyboard, type Context } from "grammy";
import { config } from "../config.js";
import { canOffer, allowMessage } from "../guard.js";
import { chat } from "../llm.js";
import { orders, type Order } from "../orders.js";
import { PERSONA } from "../persona.js";
import { stageOf } from "../../lib/persona.js";
import { warningText } from "../canhbao.js";
import { loadChat, record, saveChat, setPending, stats } from "../store.js";
import { catalog, supplierFor } from "../suppliers/registry.js";

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";
const isAdmin = (id?: number) => !!id && config.telegram.adminIds.includes(String(id));

// Nút cố định dưới ô chat, khách bấm thay vì gõ lệnh
const BTN_MENU = "📋 Danh mục";
const BTN_WARN = "⚠️ Cảnh báo lừa đảo";
const mainKeyboard = new Keyboard().text(BTN_MENU).text(BTN_WARN).resized().persistent();

async function offerable() {
  const items = await catalog();
  return items.filter((p) => canOffer(p, supplierFor(p.supplierId), p.priceVnd).ok !== false);
}

export function createTelegramBot(): Bot {
  const bot = new Bot(config.telegram.token, { client: { apiRoot: config.telegram.apiRoot } });

  async function showMenu(ctx: Context) {
    const items = await offerable();
    if (!items.length) return ctx.reply("Danh mục đang trống, bạn quay lại sau nhé.", { reply_markup: mainKeyboard });
    const kb = new InlineKeyboard();
    for (const p of items) kb.text(`${p.name}${p.priceVnd ? ` · ${vnd(p.priceVnd)}` : ""}`, `sku:${p.sku}`).row();
    return ctx.reply("Mony làm được những việc này. Bấm vào một món để xem chi tiết và đặt:", { reply_markup: kb });
  }

  // Tạo đơn, báo chủ trang kèm nút xác nhận, rồi gửi khách hướng dẫn chuyển khoản
  async function placeOrder(ctx: Context, sku: string, brief: string) {
    const product = (await catalog()).find((p) => p.sku === sku);
    if (!product) return ctx.reply("Món này không còn trong danh mục.", { reply_markup: mainKeyboard });
    const supplier = supplierFor(product.supplierId);
    const q = await supplier.quote(product.sku, 1);
    const verdict = canOffer(product, supplier, q.totalVnd);
    if (verdict.ok === false) return ctx.reply("Sản phẩm này tạm thời không bán được.", { reply_markup: mainKeyboard });

    const order = await orders.create({
      chatId: ctx.chat!.id, supplierId: supplier.id, sku: product.sku, qty: 1,
      totalVnd: q.totalVnd, costVnd: q.costVnd, brief,
      status: verdict.ok === "needs_human" ? "needs_approval" : "awaiting_payment",
    });
    const adminKb = new InlineKeyboard().text("✅ Đã nhận tiền, làm đơn", `paid:${order.id}`);
    for (const admin of config.telegram.adminIds) {
      await bot.api.sendMessage(admin, `Đơn mới ${order.id}: ${product.name}, ${vnd(q.totalVnd)}.\nYêu cầu: ${brief}`, { reply_markup: adminKb });
    }
    const { bank } = config;
    return ctx.reply(
      `Đơn ${order.id}: ${product.name}, ${vnd(q.totalVnd)}.\n\n` +
      `Bạn chuyển khoản tới ${bank.name}, số tài khoản ${bank.account}, chủ tài khoản ${bank.holder}, ` +
      `nội dung ghi "${order.id}". Khi mình nhận được tiền, sản phẩm sẽ gửi ngay trong chat này.`,
      { reply_markup: mainKeyboard },
    );
  }

  // Chủ trang xác nhận đã nhận tiền (sau này thay bằng webhook ngân hàng như Casso hoặc PayOS).
  async function confirmPaid(ctx: Context, id: string) {
    const order: Order | undefined = await orders.get(id);
    if (!order) return ctx.reply("Không có đơn này.");
    if (order.status === "delivered" || order.status === "paid") return ctx.reply("Đơn này đã xác nhận rồi.");
    await orders.setStatus(order.id, "paid");
    await record("income", order.supplierId, order.totalVnd, `Đơn ${order.id} · ${order.sku}`);
    await ctx.reply(`Đã ghi ${vnd(order.totalVnd)} vào sổ cái. Mony đang làm đơn ${order.id}, xong sẽ gửi khách.`);
    const delivery = await supplierFor(order.supplierId).fulfill(order.id, order.sku, order.brief);
    await bot.api.sendMessage(order.chatId, `Đơn ${order.id} của bạn đây:\n\n${delivery.message}`.slice(0, 4000));
    await orders.setStatus(order.id, "delivered");
    return ctx.reply(`Đã giao đơn ${order.id}.`);
  }

  bot.command("start", (ctx) =>
    ctx.reply(
      "Chào bạn, mình là Mony. Mình từng thoát khỏi một cái trại với món nợ 200 triệu, và giờ trả nợ bằng việc làm dịch vụ thật. " +
      "Bấm \"Danh mục\" bên dưới để xem mình làm được gì, hoặc \"Cảnh báo lừa đảo\" để xem dấu hiệu \"việc nhẹ lương cao\". Bạn cũng có thể nhắn hỏi mình bất cứ lúc nào.",
      { reply_markup: mainKeyboard },
    ));

  bot.command("canhbao", (ctx) => ctx.reply(warningText(), { reply_markup: mainKeyboard }));
  bot.hears(BTN_WARN, (ctx) => ctx.reply(warningText(), { reply_markup: mainKeyboard }));
  bot.command("danhmuc", showMenu);
  bot.hears(BTN_MENU, showMenu);
  bot.callbackQuery("menu", async (ctx) => { await ctx.answerCallbackQuery(); await showMenu(ctx); });

  // Bấm một món: hiện chi tiết và nút đặt
  bot.callbackQuery(/^sku:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const p = (await offerable()).find((x) => x.sku === ctx.match[1]);
    if (!p) return ctx.reply("Món này không còn trong danh mục.");
    const kb = new InlineKeyboard().text(p.priceVnd ? `🛒 Đặt món này · ${vnd(p.priceVnd)}` : "🔗 Lấy link", `buy:${p.sku}`).row().text("← Danh mục", "menu");
    return ctx.reply(`${p.name}${p.priceVnd ? ` · ${vnd(p.priceVnd)}` : ""}\n\n${p.description}`, { reply_markup: kb });
  });

  // Bấm đặt: affiliate thì gửi link ngay, dịch vụ thì hỏi yêu cầu và chờ tin nhắn tiếp theo của khách
  bot.callbackQuery(/^buy:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const p = (await offerable()).find((x) => x.sku === ctx.match[1]);
    if (!p) return ctx.reply("Món này không còn trong danh mục.");
    if (p.priceVnd === 0) return ctx.reply((await supplierFor(p.supplierId).fulfill("AFF", p.sku, "")).message);
    await setPending(ctx.chat!.id, p.sku);
    return ctx.reply(
      `Bạn kể ngắn gọn yêu cầu cho "${p.name}" trong một tin nhắn nhé: shop bán gì, khách là ai, giọng văn muốn thế nào.`,
      { reply_markup: new InlineKeyboard().text("Huỷ", "cancel") },
    );
  });

  bot.callbackQuery("cancel", async (ctx) => {
    await ctx.answerCallbackQuery("Đã huỷ");
    await setPending(ctx.chat!.id, null);
    return ctx.reply("Ok, mình huỷ rồi.", { reply_markup: mainKeyboard });
  });

  bot.callbackQuery(/^paid:(.+)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.answerCallbackQuery("Chỉ chủ trang dùng nút này");
    await ctx.answerCallbackQuery("Đang làm đơn");
    await ctx.editMessageReplyMarkup().catch(() => {});
    return confirmPaid(ctx, ctx.match[1]);
  });

  // Vẫn giữ lệnh gõ tay cho ai quen dùng: /mua <mã> <yêu cầu>
  bot.command("mua", async (ctx) => {
    const [sku, ...rest] = (ctx.match ?? "").trim().split(/\s+/);
    if (!sku) return showMenu(ctx);
    const brief = rest.join(" ");
    if (!brief) {
      await setPending(ctx.chat.id, sku);
      return ctx.reply("Bạn kể ngắn gọn yêu cầu cho đơn này trong một tin nhắn nhé.", { reply_markup: new InlineKeyboard().text("Huỷ", "cancel") });
    }
    return placeOrder(ctx, sku, brief);
  });

  bot.command("xacnhan", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    return confirmPaid(ctx, (ctx.match ?? "").trim());
  });

  bot.command("hoantien", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    const [id, ...why] = (ctx.match ?? "").trim().split(/\s+/);
    const order = await orders.get(id);
    if (!order) return ctx.reply("Không có đơn này.");
    await supplierFor(order.supplierId).refund(order.id, why.join(" "));
    await orders.setStatus(order.id, "refunded");
    await record("cost", order.supplierId, order.totalVnd, `Hoàn tiền đơn ${order.id}`);
    return ctx.reply(`Đã ghi hoàn tiền đơn ${order.id}. Nhớ chuyển trả khách qua ngân hàng.`);
  });

  // Ghi khoản ủng hộ đã xác nhận: /ungho 50000 lời nhắn
  bot.command("ungho", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    const [amount, ...note] = (ctx.match ?? "").trim().split(/\s+/);
    const n = Number(amount);
    if (!Number.isInteger(n) || n <= 0) return ctx.reply("Cú pháp: /ungho <số tiền> <lời nhắn>");
    await record("donation", "donate", n, note.join(" ") || "Ủng hộ");
    return ctx.reply(`Đã ghi ${vnd(n)} tiền ủng hộ.`);
  });

  // Tin nhắn thường: nếu khách đang đặt món thì đây là yêu cầu của đơn, không thì Mony trò chuyện tư vấn.
  bot.on("message:text", async (ctx) => {
    const state = await loadChat(ctx.chat.id);
    const gate = allowMessage(state.hits);
    if (!gate.ok) return saveChat(ctx.chat.id, state.history, gate.hits);
    if (state.pending) {
      await setPending(ctx.chat.id, null);
      await saveChat(ctx.chat.id, state.history, gate.hits);
      return placeOrder(ctx, state.pending, ctx.message.text.slice(0, 2000));
    }
    const items = await offerable();
    const menu = items.map((p) => `${p.sku}: ${p.name} - ${p.priceVnd ? vnd(p.priceVnd) : "miễn phí (link giới thiệu)"} - ${p.description}`).join("\n");
    const h = [...state.history, { role: "user" as const, content: ctx.message.text }];
    await ctx.replyWithChatAction("typing").catch(() => {});
    const s = await stats();
    const stage = stageOf(s.repaid, s.repaid + s.remaining).vi;
    const reply = await chat([{ role: "system", content: `${PERSONA}\n\nGiai đoạn: ${stage}\n\nDanh mục được phép bán:\n${menu}` }, ...h.slice(-10)]);
    h.push({ role: "assistant", content: reply });
    await saveChat(ctx.chat.id, h.slice(-20), gate.hits);
    await ctx.reply(reply, { reply_markup: new InlineKeyboard().text("📋 Xem danh mục", "menu") });
  });

  bot.catch(async (err) => {
    console.error("Lỗi bot:", err.error);
    const msg = err.error instanceof Error && err.error.message.includes("Hết hạn mức")
      ? "Hôm nay Mony làm hết sức rồi, mai mình trả lời bạn nhé."
      : "Mony đang gặp trục trặc, bạn thử lại sau ít phút nhé.";
    await err.ctx.reply(msg).catch(() => {});
  });
  return bot;
}
