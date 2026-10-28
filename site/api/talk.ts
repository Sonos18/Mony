import { chat } from "../bot/llm.js";
import { stats, vnDay } from "../bot/store.js";
import { db, env, json, sha256 } from "../lib/db.js";
import { TALK_PERSONA } from "../lib/persona.js";

// Khách nói chuyện trực tiếp với Mony trên trang. Mony nói tiếng Anh như trong phim, kèm phụ đề tiếng Việt.
// Dùng model nhỏ nhất (mặc định gpt-5.4-nano, suy luận thấp) trong hạn mức token miễn phí mỗi ngày,
// chung bộ đếm với bot Telegram (site/bot/llm.ts). Mỗi khách có giới hạn lượt mỗi ngày.
const PER_VISITOR = Number(process.env.TALK_DAILY_PER_VISITOR ?? 20);

const MOODS = ["neutral", "happy", "laugh", "sad", "tired", "surprised", "shy", "worried", "angry"];
type Line = { en: string; vi: string; mood?: string };
const LINES: Record<string, Line> = {
  tired: { en: "We talked a lot today. Let me get back to work. See you tomorrow.", vi: "Hôm nay mình nói nhiều rồi, để Mony đi làm tiếp. Mai nói tiếp nhé.", mood: "tired" },
  broke: { en: "My mouth is out of electricity for today. Talk tomorrow?", vi: "Hôm nay hết tiền điện cho cái miệng này rồi. Mai nói tiếp nhé?", mood: "tired" },
  pass: { en: "I'd rather not talk about that. Something else?", vi: "Chuyện đó Mony xin phép không nói. Mình nói chuyện khác nhé?", mood: "shy" },
  error: { en: "The Wi-Fi in this room is acting up again. Say that again?", vi: "Mạng phòng trọ lại chập chờn. Bạn nói lại giúp Mony nhé?", mood: "worried" },
};

type Turn = { role: "user" | "assistant"; content: string };

// Chỉ giữ vài lượt gần nhất để tiết kiệm token
function cleanTurns(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  const turns = raw
    .filter((t): t is Turn => !!t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
    .map((t) => ({ role: t.role, content: t.content.trim().slice(0, 300) }))
    .filter((t) => t.content)
    .slice(-6);
  while (turns.length && turns[0].role !== "user") turns.shift();
  const out: Turn[] = [];
  for (const t of turns) {
    const last = out[out.length - 1];
    if (last && last.role === t.role) last.content += "\n" + t.content;
    else out.push({ ...t });
  }
  return out[out.length - 1]?.role === "user" ? out : [];
}

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " VND";

async function facts() {
  const s = await stats();
  return `Today's numbers: debt ${vnd(env.DEBT_TOTAL)}, repaid ${vnd(s.repaid)}, remaining ${vnd(s.remaining)}, ` +
    `${s.followers} followers, deadline ${env.DEADLINE}, Vietnam time ${new Date(Date.now() + 7 * 3600_000).toISOString().slice(11, 16)}.`;
}

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[*_#`]/g, "").trim().slice(0, max) : "");

function parse(text: string): Line | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const o = JSON.parse(m[0]) as { en?: unknown; vi?: unknown; mood?: unknown };
      const en = clean(o.en, 400);
      const mood = typeof o.mood === "string" && MOODS.includes(o.mood.toLowerCase()) ? o.mood.toLowerCase() : "neutral";
      if (en) return { en, vi: clean(o.vi, 400), mood };
    } catch {}
  }
  // Model không trả JSON thì dùng nguyên câu làm lời tiếng Anh
  const en = clean(text, 400);
  return en ? { en, vi: "", mood: "neutral" } : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { messages?: unknown };
  const turns = cleanTurns(body.messages);
  if (!turns.length) return json({ error: "Cần messages, lượt cuối là của khách" }, 400);

  const sql = await db();
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const who = await sha256(`talk:${ip}:${env.FOLLOW_SALT}`);
  const [use] = await sql<{ n: number }[]>`
    INSERT INTO talk_usage (day, id_hash, n) VALUES (${vnDay()}, ${who}, 1)
    ON CONFLICT (day, id_hash) DO UPDATE SET n = talk_usage.n + 1 RETURNING n`;
  if (use.n > PER_VISITOR) return json({ ...LINES.tired, limited: true }, 429);

  let line: Line | null;
  try {
    const text = await chat([{ role: "system", content: `${TALK_PERSONA}\n\n${await facts()}` }, ...turns], { light: true, json: true, maxTokens: 1200 });
    line = parse(text);
  } catch (e) {
    console.error("talk", e);
    const out = e instanceof Error && e.message.includes("Hết hạn mức") ? LINES.broke : LINES.error;
    return json({ ...out, limited: out === LINES.broke }, out === LINES.broke ? 429 : 502);
  }
  return json({ ...(line ?? LINES.pass), left: Math.max(0, PER_VISITOR - use.n) });
}
