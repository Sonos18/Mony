import { db, env } from "../lib/db.js";
import type { Message } from "./llm.js";

export const vnDay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
export const dayNumber = () => Math.floor((Date.now() - new Date(env.START_DATE).getTime()) / 86_400_000) + 1;

// ---- Sổ cái và nhật ký (cùng cơ sở dữ liệu với trang) ----
export type LedgerKind = "income" | "cost" | "donation";

export async function record(kind: LedgerKind, source: string, amount: number, note?: string) {
  const sql = await db();
  await sql`INSERT INTO ledger (kind, source, amount, note) VALUES (${kind}, ${source}, ${Math.round(amount)}, ${note ?? null})`;
}

export async function writeDiary(day: number, title: string, body: string, mood?: string) {
  const sql = await db();
  await sql`INSERT INTO diary (day, title, body, mood) VALUES (${day}, ${title}, ${body}, ${mood ?? null})`;
}

export async function hasDiary(day: number) {
  const sql = await db();
  const [row] = await sql`SELECT 1 FROM diary WHERE day = ${day} LIMIT 1`;
  return !!row;
}

export async function stats() {
  const sql = await db();
  const rows = await sql<{ kind: string; total: number }[]>`SELECT kind, COALESCE(SUM(amount), 0)::float8 AS total FROM ledger GROUP BY kind`;
  const by = Object.fromEntries(rows.map((r) => [r.kind, r.total]));
  const repaid = Math.max(0, (by.income ?? 0) + (by.donation ?? 0) - (by.cost ?? 0));
  const [f] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM followers`;
  return { remaining: Math.max(0, env.DEBT_TOTAL - repaid), repaid, followers: f?.n ?? 0 };
}

export async function ledgerOn(day: string) {
  const sql = await db();
  return sql<{ kind: LedgerKind; source: string; amount: number; note: string | null }[]>`
    SELECT kind, source, amount::float8 AS amount, note FROM ledger
     WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = ${day} ORDER BY id`;
}

// ---- Lịch sử trò chuyện và giới hạn tin nhắn theo từng chat ----
export async function loadChat(chatId: number) {
  const sql = await db();
  const [row] = await sql<{ history: Message[]; hits: number[] }[]>`SELECT history, hits FROM chat_state WHERE chat_id = ${chatId}`;
  return { history: row?.history ?? [], hits: row?.hits ?? [] };
}

export async function saveChat(chatId: number, history: Message[], hits: number[]) {
  const sql = await db();
  await sql`
    INSERT INTO chat_state (chat_id, history, hits) VALUES (${chatId}, ${sql.json(history)}, ${sql.json(hits)})
    ON CONFLICT (chat_id) DO UPDATE SET history = EXCLUDED.history, hits = EXCLUDED.hits`;
}

// ---- Token đã dùng trong ngày và chi phí AI ----
export async function tokensToday(model: string) {
  const sql = await db();
  const [row] = await sql<{ tokens: number }[]>`SELECT tokens::float8 AS tokens FROM llm_usage WHERE day = ${vnDay()} AND model = ${model}`;
  return row?.tokens ?? 0;
}

export async function addUsage(model: string, tokens: number, costVnd: number) {
  const sql = await db();
  const day = vnDay();
  await sql`
    INSERT INTO llm_usage (day, model, tokens) VALUES (${day}, ${model}, ${tokens})
    ON CONFLICT (day, model) DO UPDATE SET tokens = llm_usage.tokens + ${tokens}`;
  if (costVnd <= 0) return;
  // Chi phí AI cộng dồn vào một dòng chi mỗi ngày để sổ cái không bị ngập dòng lặt vặt
  await sql.begin(async (tx) => {
    const [row] = await tx<{ cost_vnd: number; ledger_id: number | null }[]>`
      INSERT INTO llm_spend (day, cost_vnd) VALUES (${day}, ${costVnd})
      ON CONFLICT (day) DO UPDATE SET cost_vnd = llm_spend.cost_vnd + ${costVnd} RETURNING cost_vnd, ledger_id`;
    const amount = Math.ceil(row.cost_vnd);
    if (row.ledger_id) {
      await tx`UPDATE ledger SET amount = ${amount} WHERE id = ${row.ledger_id}`;
    } else {
      const [l] = await tx<{ id: number }[]>`
        INSERT INTO ledger (kind, source, amount, note) VALUES ('cost', 'llm', ${amount}, ${`Chi phí gọi mô hình AI ngày ${day}`}) RETURNING id`;
      await tx`UPDATE llm_spend SET ledger_id = ${l.id} WHERE day = ${day}`;
    }
  });
}
