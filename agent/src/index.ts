import { config } from "./config.js";
import { createTelegramBot } from "./channels/telegram.js";
import { writeDailyDiary } from "./diary.js";
import { suppliers } from "./suppliers/registry.js";

async function main() {
  for (const s of suppliers) {
    const h = await s.health();
    console.log(`Nguồn ${s.id} (${s.compliance}): ${h.ok ? "sẵn sàng" : `chưa sẵn sàng${h.note ? `, ${h.note}` : ""}`}`);
  }

  // Nhật ký lúc 21:00 giờ Việt Nam mỗi ngày
  let lastDiary = "";
  setInterval(() => {
    const vn = new Date(Date.now() + 7 * 3_600_000);
    const key = vn.toISOString().slice(0, 10);
    if (vn.getUTCHours() === 21 && lastDiary !== key) {
      lastDiary = key;
      writeDailyDiary().catch((e) => console.error("Lỗi viết nhật ký:", e));
    }
  }, 60_000);

  if (!config.telegram.token) {
    console.log("Chưa có TELEGRAM_BOT_TOKEN, chỉ chạy lịch viết nhật ký.");
    return;
  }
  const bot = createTelegramBot();
  console.log("Mony đã lên Telegram.");
  await bot.start();
}

main().catch((e) => { console.error(e); process.exit(1); });
