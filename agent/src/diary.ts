import { pathToFileURL } from "node:url";
import { config } from "./config.js";
import { chat, flushCost } from "./llm.js";
import { PERSONA } from "./persona.js";
import { site } from "./site.js";

// Viết một trang nhật ký từ số liệu thật của ngày hôm nay. Chạy mỗi tối (cron hoặc lịch của index.ts).
export async function writeDailyDiary(): Promise<void> {
  const day = Math.floor((Date.now() - new Date(config.startDate).getTime()) / 86_400_000) + 1;
  const stats = await site.stats();
  const today = new Date().toISOString().slice(0, 10);
  const entries = (await site.ledger(100)).filter((e) => e.created_at.startsWith(today));
  const facts = entries.length
    ? entries.map((e) => `${e.kind} ${e.amount}đ (${e.note ?? e.source})`).join("; ")
    : "hôm nay không có giao dịch nào";

  const raw = await chat([
    { role: "system", content: PERSONA },
    {
      role: "user",
      content:
        `Viết trang nhật ký ngày ${day}. Số liệu thật, không được bịa thêm hay làm tròn: ` +
        `còn nợ ${stats.remaining}đ, đã trả ${stats.repaid}đ, ${stats.followers} người theo dõi. Giao dịch hôm nay: ${facts}.\n` +
        `Trả về JSON đúng dạng {"title": "...", "body": "...", "mood": "..."}; body 120–220 chữ, xuống dòng bằng \\n.`,
    },
  ], { maxTokens: 2500, purpose: "diary" });

  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const entry = JSON.parse(json) as { title: string; body: string; mood?: string };
  await site.writeDiary(day, entry.title, entry.body, entry.mood);
  await flushCost(true);
  console.log(`Đã ghi nhật ký ngày ${day}: ${entry.title}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  writeDailyDiary().catch((e) => { console.error(e); process.exit(1); });
}
