import { chat } from "./llm.js";
import { PERSONA } from "./persona.js";
import { dayNumber, hasDiary, ledgerOn, stats, vnDay, writeDiary } from "./store.js";

// Viết một trang nhật ký từ số liệu thật của ngày hôm nay. Cron của Vercel gọi lúc 21:00 giờ Việt Nam.
// Ngày nào đã có nhật ký thì bỏ qua, nên gọi lại nhiều lần cũng không sao.
export async function writeDailyDiary(): Promise<string> {
  const day = dayNumber();
  if (await hasDiary(day)) return `Ngày ${day} đã có nhật ký`;
  const s = await stats();
  const entries = await ledgerOn(vnDay());
  const facts = entries.length
    ? entries.map((e) => `${e.kind} ${e.amount}đ (${e.note ?? e.source})`).join("; ")
    : "hôm nay không có giao dịch nào";

  const raw = await chat([
    { role: "system", content: PERSONA },
    {
      role: "user",
      content:
        `Viết trang nhật ký ngày ${day}. Số liệu thật, không được bịa thêm hay làm tròn: ` +
        `còn nợ ${s.remaining}đ, đã trả ${s.repaid}đ, ${s.followers} người theo dõi. Giao dịch hôm nay: ${facts}.\n` +
        `Trả về JSON đúng dạng {"title": "...", "body": "...", "mood": "..."}; body 120–220 chữ, xuống dòng bằng \\n.`,
    },
  ], { maxTokens: 2500 });

  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const entry = JSON.parse(json) as { title: string; body: string; mood?: string };
  await writeDiary(day, entry.title, entry.body, entry.mood);
  return `Đã ghi nhật ký ngày ${day}: ${entry.title}`;
}
