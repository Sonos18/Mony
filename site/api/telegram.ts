import { waitUntil } from "@vercel/functions";
import type { Bot } from "grammy";
import type { Update } from "grammy/types";
import { createTelegramBot } from "../bot/channels/telegram.js";
import { config } from "../bot/config.js";
import { env, isAdmin, json, sha256 } from "../lib/db.js";

// Bot Telegram chạy bằng webhook: Telegram gửi từng tin tới đây. Trả lời Telegram ngay,
// còn việc của Mony (gọi AI, làm đơn) chạy tiếp ở nền trong giới hạn thời gian của hàm.
let bot: Bot | null = null;
let ready: Promise<void> | null = null;
function getBot() {
  bot ??= createTelegramBot();
  ready ??= bot.init().catch((e) => { ready = null; throw e; });
  return ready.then(() => bot!);
}

// Chuỗi bí mật Telegram gửi kèm mỗi tin, để người ngoài không giả tin gửi vào đây
const secret = () => sha256(`telegram:${config.telegram.token}:${env.FOLLOW_SALT}`);

export async function POST(request: Request) {
  if (!config.telegram.token) return json({ error: "Thiếu TELEGRAM_BOT_TOKEN" }, 503);
  if (request.headers.get("x-telegram-bot-api-secret-token") !== (await secret())) return json({ error: "unauthorized" }, 401);
  const update = (await request.json()) as Update;
  waitUntil(getBot().then((b) => b.handleUpdate(update)).catch((e) => console.error("telegram", e)));
  return json({ ok: true });
}

// Bật webhook một lần sau khi deploy: mở /api/telegram?setup=<ADMIN_TOKEN> trên trình duyệt.
export async function GET(request: Request) {
  const url = new URL(request.url);
  // Đọc thô thay vì searchParams, vì searchParams đổi dấu "+" trong token thành dấu cách
  const raw = url.search.match(/[?&]setup=([^&]*)/)?.[1] ?? "";
  let token = raw;
  try { token = decodeURIComponent(raw); } catch {}
  token = token.trim();
  const auth = new Request(request.url, { headers: { authorization: `Bearer ${token}` } });
  if (!env.ADMIN_TOKEN) return json({ error: "Chưa đặt ADMIN_TOKEN trên Vercel" }, 503);
  if (!isAdmin(auth)) return json({ error: "unauthorized", hint: "ADMIN_TOKEN trong link không khớp biến trên Vercel" }, 401);
  if (!config.telegram.token) return json({ error: "Thiếu TELEGRAM_BOT_TOKEN" }, 503);
  const b = await getBot();
  const hook = `https://${request.headers.get("x-forwarded-host") ?? url.host}/api/telegram`;
  await b.api.setWebhook(hook, { secret_token: await secret(), allowed_updates: ["message"], drop_pending_updates: true });
  await b.api.setMyCommands([
    { command: "danhmuc", description: "Xem Mony làm được gì" },
    { command: "mua", description: "Đặt đơn: /mua <mã> <yêu cầu>" },
    { command: "canhbao", description: "Dấu hiệu việc nhẹ lương cao lừa đảo" },
  ]);
  return json({ ok: true, webhook: hook, bot: b.botInfo.username });
}
