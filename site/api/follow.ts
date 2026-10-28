import { db, env, json, sha256 } from "../lib/db.js";

// Mỗi IP chỉ tính một lần. Chỉ lưu mã băm có muối, không lưu IP.
export async function POST(request: Request) {
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const id = await sha256(`${ip}:${env.FOLLOW_SALT}`);
  const sql = await db();
  await sql`INSERT INTO followers (id_hash) VALUES (${id}) ON CONFLICT DO NOTHING`;
  const [row] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM followers`;
  return json({ followers: row?.n ?? 0 });
}
