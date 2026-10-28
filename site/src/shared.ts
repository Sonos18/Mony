export interface Env {
  DB: D1Database;
  ADMIN_TOKEN: string;
  FOLLOW_SALT: string;
  DEBT_TOTAL: string;
  START_DATE: string;
  DEADLINE: string;
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export function isAdmin(request: Request, env: Env): boolean {
  const auth = request.headers.get("authorization") ?? "";
  return !!env.ADMIN_TOKEN && auth === `Bearer ${env.ADMIN_TOKEN}`;
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const clampLimit = (url: URL, fallback: number, max: number) =>
  Math.min(max, Math.max(1, Number(url.searchParams.get("limit")) || fallback));
