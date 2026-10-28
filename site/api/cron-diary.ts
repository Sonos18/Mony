import { writeDailyDiary } from "../bot/diary.js";
import { json } from "../lib/db.js";

// Cron của Vercel gọi lúc 14:00 UTC (21:00 giờ Việt Nam). Nếu đặt CRON_SECRET, Vercel gửi kèm nó trong header.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);
  try {
    return json({ ok: true, result: await writeDailyDiary() });
  } catch (e) {
    console.error("diary", e);
    return json({ ok: false, error: String(e) }, 500);
  }
}
