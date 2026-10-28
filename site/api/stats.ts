import { db, env, json } from "../lib/db.js";

// Số liệu tổng cho đầu trang: còn nợ bao nhiêu, kiếm được bao nhiêu, bao nhiêu người theo dõi.
export async function GET() {
  const sql = await db();
  const totals = await sql<{ kind: string; total: number }[]>`
    SELECT kind, COALESCE(SUM(amount), 0)::float8 AS total FROM ledger GROUP BY kind`;
  const by = Object.fromEntries(totals.map((r) => [r.kind, r.total]));
  const income = by.income ?? 0;
  const cost = by.cost ?? 0;
  const donated = by.donation ?? 0;

  const [followers] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM followers`;
  const sources = await sql`
    SELECT s.id, s.name, s.description, s.status, s.compliance,
           COALESCE(SUM(CASE WHEN l.kind = 'income' THEN l.amount END), 0)::float8 AS earned
      FROM sources s LEFT JOIN ledger l ON l.source = s.id
     GROUP BY s.id ORDER BY earned DESC, s.name`;

  const repaid = Math.max(0, income + donated - cost);
  return json({
    debt_total: env.DEBT_TOTAL,
    repaid,
    remaining: Math.max(0, env.DEBT_TOTAL - repaid),
    income,
    cost,
    donated,
    followers: followers?.n ?? 0,
    start_date: env.START_DATE,
    deadline: env.DEADLINE,
    sources,
  });
}
