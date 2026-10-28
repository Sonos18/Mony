import { type Env, json } from "../../src/shared";

// Số liệu tổng cho đầu trang: còn nợ bao nhiêu, kiếm được bao nhiêu, bao nhiêu người theo dõi.
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const totals = await env.DB.prepare(
    "SELECT kind, COALESCE(SUM(amount), 0) AS total FROM ledger GROUP BY kind"
  ).all<{ kind: string; total: number }>();
  const by = Object.fromEntries(totals.results.map((r) => [r.kind, r.total]));
  const income = by.income ?? 0;
  const cost = by.cost ?? 0;
  const donated = by.donation ?? 0;

  const followers = await env.DB.prepare("SELECT COUNT(*) AS n FROM followers").first<{ n: number }>();
  const sources = await env.DB.prepare(
    `SELECT s.id, s.name, s.description, s.status, s.compliance,
            COALESCE(SUM(CASE WHEN l.kind = 'income' THEN l.amount END), 0) AS earned
       FROM sources s LEFT JOIN ledger l ON l.source = s.id
      GROUP BY s.id ORDER BY earned DESC, s.name`
  ).all();

  const debtTotal = Number(env.DEBT_TOTAL);
  const repaid = Math.max(0, income + donated - cost);
  return json({
    debt_total: debtTotal,
    repaid,
    remaining: Math.max(0, debtTotal - repaid),
    income,
    cost,
    donated,
    followers: followers?.n ?? 0,
    start_date: env.START_DATE,
    deadline: env.DEADLINE,
    sources: sources.results,
  });
};
