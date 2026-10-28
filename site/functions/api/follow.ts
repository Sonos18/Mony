import { type Env, json, sha256 } from "../../src/shared";

// Mỗi IP chỉ tính một lần. Chỉ lưu mã băm có muối, không lưu IP.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const id = await sha256(`${ip}:${env.FOLLOW_SALT ?? ""}`);
  await env.DB.prepare("INSERT OR IGNORE INTO followers (id_hash) VALUES (?)").bind(id).run();
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM followers").first<{ n: number }>();
  return json({ followers: row?.n ?? 0 });
};
