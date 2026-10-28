import { type Env, json, isAdmin, clampLimit } from "../../src/shared";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const limit = clampLimit(new URL(request.url), 20, 100);
  const rows = await env.DB.prepare(
    "SELECT id, day, title, body, mood, created_at FROM diary ORDER BY id DESC LIMIT ?"
  ).bind(limit).all();
  return json({ entries: rows.results });
};

// Agent ghi nhật ký qua đây, cần ADMIN_TOKEN.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);
  const body = await request.json<{ day?: number; title?: string; body?: string; mood?: string }>();
  if (!body.title || !body.body || typeof body.day !== "number") {
    return json({ error: "Cần day (số), title và body" }, 400);
  }
  const res = await env.DB.prepare("INSERT INTO diary (day, title, body, mood) VALUES (?, ?, ?, ?)")
    .bind(body.day, body.title.slice(0, 200), body.body.slice(0, 5000), body.mood ?? null)
    .run();
  return json({ id: res.meta.last_row_id }, 201);
};
