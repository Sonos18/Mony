import { type Env, json, isAdmin, clampLimit } from "../../src/shared";

const KINDS = new Set(["income", "cost", "donation"]);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const limit = clampLimit(new URL(request.url), 30, 200);
  const rows = await env.DB.prepare(
    "SELECT id, kind, source, amount, note, created_at FROM ledger ORDER BY id DESC LIMIT ?"
  ).bind(limit).all();
  return json({ entries: rows.results });
};

// Ghi một khoản thu, chi hoặc donate. Agent và webhook ngân hàng dùng chung endpoint này.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);
  const e = await request.json<{ kind?: string; source?: string; amount?: number; note?: string }>();
  if (!e.kind || !KINDS.has(e.kind) || !e.source || !Number.isInteger(e.amount) || e.amount! < 0) {
    return json({ error: "Cần kind (income|cost|donation), source và amount (số nguyên VND)" }, 400);
  }
  const res = await env.DB.prepare("INSERT INTO ledger (kind, source, amount, note) VALUES (?, ?, ?, ?)")
    .bind(e.kind, e.source, e.amount, e.note?.slice(0, 500) ?? null)
    .run();
  return json({ id: res.meta.last_row_id }, 201);
};
