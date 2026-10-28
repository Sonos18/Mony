import { db, json, isAdmin, clampLimit } from "../lib/db.js";

const KINDS = new Set(["income", "cost", "donation"]);

export async function GET(request: Request) {
  const sql = await db();
  const rows = await sql`
    SELECT id, kind, source, amount::float8 AS amount, note, created_at FROM ledger ORDER BY id DESC LIMIT ${clampLimit(request, 30, 200)}`;
  return json({ entries: rows });
}

// Ghi một khoản thu, chi hoặc donate. Agent và webhook ngân hàng dùng chung endpoint này.
export async function POST(request: Request) {
  if (!isAdmin(request)) return json({ error: "unauthorized" }, 401);
  const e = (await request.json()) as { kind?: string; source?: string; amount?: number; note?: string };
  if (!e.kind || !KINDS.has(e.kind) || !e.source || !Number.isInteger(e.amount) || e.amount! < 0) {
    return json({ error: "Cần kind (income|cost|donation), source và amount (số nguyên VND)" }, 400);
  }
  const sql = await db();
  const [row] = await sql`
    INSERT INTO ledger (kind, source, amount, note)
    VALUES (${e.kind}, ${e.source}, ${e.amount!}, ${e.note?.slice(0, 500) ?? null}) RETURNING id`;
  return json({ id: row.id }, 201);
}
