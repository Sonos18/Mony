import { db, env, json, sha256 } from "../lib/db.js";
import { TALK_PERSONA } from "../lib/persona.js";

// Khách nói chuyện trực tiếp với Mony. Mỗi khách có giới hạn lượt mỗi ngày, cả trang có trần chi tiêu mỗi ngày,
// và tiền AI cộng dồn vào một dòng "chi" trong sổ cái của ngày đó. Mony trả lời bằng model
// mini của OpenAI, nằm trong hạn mức token miễn phí mỗi ngày khi bật chia sẻ dữ liệu với OpenAI.
const cfg = {
  key: process.env.OPENAI_API_KEY ?? "",
  model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
  base: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  // Hạn mức miễn phí của nhóm model mini là 2,5 triệu token mỗi ngày; chừa lại một khoảng an toàn.
  dailyTokens: Number(process.env.TALK_DAILY_TOKENS ?? 2_000_000),
  perVisitor: Number(process.env.TALK_DAILY_PER_VISITOR ?? 20),
  budgetVnd: Number(process.env.TALK_DAILY_BUDGET_VND ?? 50000),
  usdVnd: Number(process.env.USD_VND ?? 26000),
};

// Giá USD cho mỗi triệu token (vào, ra). Mặc định 0 vì nằm trong hạn mức miễn phí; điền giá thật nếu dùng quá hạn mức.
const PRICE_IN = Number(process.env.OPENAI_PRICE_IN ?? 0);
const PRICE_OUT = Number(process.env.OPENAI_PRICE_OUT ?? 0);

const LINES = {
  off: "Hôm nay Mony bận chạy việc, chưa nói chuyện được. Bạn quay lại sau nhé.",
  tired: "Hôm nay mình nói với bạn nhiều rồi, để Mony đi làm tiếp. Mai nói tiếp nhé.",
  broke: "Hôm nay tiền điện cho cái miệng này hết rồi. Mai Mony nói tiếp với bạn.",
  pass: "Chuyện đó Mony xin phép không nói. Mình nói chuyện khác nhé.",
  error: "Mạng phòng trọ lại chập chờn. Bạn nói lại giúp Mony được không?",
};

type Turn = { role: "user" | "assistant"; content: string };

function cleanTurns(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  const turns = raw
    .filter((t): t is Turn => !!t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
    .map((t) => ({ role: t.role, content: t.content.trim().slice(0, 400) }))
    .filter((t) => t.content)
    .slice(-10);
  while (turns.length && turns[0].role !== "user") turns.shift();
  // Gộp các lượt liền nhau cùng một người nói
  const out: Turn[] = [];
  for (const t of turns) {
    const last = out[out.length - 1];
    if (last && last.role === t.role) last.content += "\n" + t.content;
    else out.push({ ...t });
  }
  return out[out.length - 1]?.role === "user" ? out : [];
}

const vnDay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";

async function factsToday(sql: Awaited<ReturnType<typeof db>>) {
  const rows = await sql<{ kind: string; total: number }[]>`
    SELECT kind, COALESCE(SUM(amount), 0)::float8 AS total FROM ledger GROUP BY kind`;
  const by = Object.fromEntries(rows.map((r) => [r.kind, r.total]));
  const repaid = Math.max(0, (by.income ?? 0) + (by.donation ?? 0) - (by.cost ?? 0));
  const [f] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM followers`;
  const day = Math.max(1, Math.ceil((Date.now() - new Date(env.START_DATE).getTime()) / 86400000));
  return `Số liệu hôm nay (lấy từ sổ cái thật):
- Ngày thứ ${day} của nhật ký, hạn chót ${env.DEADLINE}.
- Tổng nợ ${vnd(env.DEBT_TOTAL)}, đã trả ${vnd(repaid)}, còn ${vnd(Math.max(0, env.DEBT_TOTAL - repaid))}.
- Tự kiếm ${vnd(by.income ?? 0)}, được ủng hộ ${vnd(by.donation ?? 0)}, chi phí ${vnd(by.cost ?? 0)}.
- ${f?.n ?? 0} người đang theo dõi.
- Giờ Việt Nam bây giờ: ${new Date(Date.now() + 7 * 3600_000).toISOString().slice(11, 16)}.`;
}

type Answer = { text: string; refused: boolean; costUsd: number; tokens: number };

async function askOpenAI(system: string, turns: Turn[]): Promise<Answer> {
  const res = await fetch(`${cfg.base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify({ model: cfg.model, max_completion_tokens: 2000, messages: [{ role: "system", content: system }, ...turns] }),
  });
  if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const r = (await res.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  const tin = r.usage?.prompt_tokens ?? 0, tout = r.usage?.completion_tokens ?? 0;
  const costUsd = (tin * PRICE_IN + tout * PRICE_OUT) / 1e6;
  const choice = r.choices?.[0];
  return { text: (choice?.message?.content ?? "").trim(), refused: choice?.finish_reason === "content_filter", costUsd, tokens: tin + tout };
}

export async function POST(request: Request) {
  if (!cfg.key) return json({ reply: LINES.off, off: true }, 503);
  const body = (await request.json().catch(() => ({}))) as { messages?: unknown };
  const turns = cleanTurns(body.messages);
  if (!turns.length) return json({ error: "Cần messages, lượt cuối là của khách" }, 400);

  const sql = await db();
  const day = vnDay();
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const who = await sha256(`talk:${ip}:${env.FOLLOW_SALT}`);

  const [spend] = await sql<{ cost_vnd: number; tokens: number }[]>`SELECT cost_vnd, tokens::float8 AS tokens FROM talk_spend WHERE day = ${day}`;
  if ((spend?.cost_vnd ?? 0) >= cfg.budgetVnd || (spend?.tokens ?? 0) >= cfg.dailyTokens) return json({ reply: LINES.broke, limited: true }, 429);
  const [use] = await sql<{ n: number }[]>`
    INSERT INTO talk_usage (day, id_hash, n) VALUES (${day}, ${who}, 1)
    ON CONFLICT (day, id_hash) DO UPDATE SET n = talk_usage.n + 1 RETURNING n`;
  if (use.n > cfg.perVisitor) return json({ reply: LINES.tired, limited: true }, 429);

  let answer: Answer;
  try {
    answer = await askOpenAI(`${TALK_PERSONA}\n\n${await factsToday(sql)}`, turns);
  } catch (e) {
    console.error("talk", e);
    return json({ reply: LINES.error }, 502);
  }

  const costVnd = answer.costUsd * cfg.usdVnd;
  await sql.begin(async (tx) => {
    const [row] = await tx<{ cost_vnd: number; ledger_id: number | null }[]>`
      INSERT INTO talk_spend (day, cost_vnd, tokens) VALUES (${day}, ${costVnd}, ${answer.tokens})
      ON CONFLICT (day) DO UPDATE SET cost_vnd = talk_spend.cost_vnd + ${costVnd}, tokens = talk_spend.tokens + ${answer.tokens}
      RETURNING cost_vnd, ledger_id`;
    // Còn trong hạn mức miễn phí thì không có gì để ghi sổ
    if (row.cost_vnd <= 0) return;
    const amount = Math.ceil(row.cost_vnd);
    if (row.ledger_id) {
      await tx`UPDATE ledger SET amount = ${amount} WHERE id = ${row.ledger_id}`;
    } else {
      const [l] = await tx<{ id: number }[]>`
        INSERT INTO ledger (kind, source, amount, note)
        VALUES ('cost', 'ai-talk', ${amount}, ${`Tiền AI để Mony nói chuyện với khách ngày ${day}`}) RETURNING id`;
      await tx`UPDATE talk_spend SET ledger_id = ${l.id} WHERE day = ${day}`;
    }
  });

  const reply = answer.refused || !answer.text ? LINES.pass : answer.text.replace(/[*_#`]/g, "").slice(0, 600);
  return json({ reply, left: Math.max(0, cfg.perVisitor - use.n) });
}
