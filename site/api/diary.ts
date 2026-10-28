import { db, json, isAdmin, clampLimit } from "../lib/db.js";

export async function GET(request: Request) {
  const sql = await db();
  const rows = await sql`
    SELECT id, day, title, body, mood, created_at FROM diary ORDER BY id DESC LIMIT ${clampLimit(request, 20, 100)}`;
  return json({ entries: rows });
}

// Agent ghi nhật ký qua đây, cần ADMIN_TOKEN.
export async function POST(request: Request) {
  if (!isAdmin(request)) return json({ error: "unauthorized" }, 401);
  const body = (await request.json()) as { day?: number; title?: string; body?: string; mood?: string };
  if (!body.title || !body.body || typeof body.day !== "number") {
    return json({ error: "Cần day (số), title và body" }, 400);
  }
  const sql = await db();
  const [row] = await sql`
    INSERT INTO diary (day, title, body, mood)
    VALUES (${body.day}, ${body.title.slice(0, 200)}, ${body.body.slice(0, 5000)}, ${body.mood ?? null}) RETURNING id`;
  return json({ id: row.id }, 201);
}
