// Bản Vercel: dữ liệu nằm trong Postgres (Neon). Bảng được tạo tự động ở lần gọi API đầu tiên.
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
export const sql = postgres(url ?? "", { max: 1, idle_timeout: 20, onnotice: () => {}, ssl: url?.includes("localhost") ? false : "require" });

export const env = {
  ADMIN_TOKEN: process.env.ADMIN_TOKEN ?? "",
  FOLLOW_SALT: process.env.FOLLOW_SALT ?? "",
  DEBT_TOTAL: Number(process.env.DEBT_TOTAL ?? 200000000),
  START_DATE: process.env.START_DATE ?? "2026-10-28",
  DEADLINE: process.env.DEADLINE ?? "2027-10-28",
};

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS followers (
     id_hash TEXT PRIMARY KEY,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS diary (
     id SERIAL PRIMARY KEY,
     day INTEGER NOT NULL,
     title TEXT NOT NULL,
     body TEXT NOT NULL,
     mood TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS ledger (
     id SERIAL PRIMARY KEY,
     kind TEXT NOT NULL CHECK (kind IN ('income', 'cost', 'donation')),
     source TEXT NOT NULL,
     amount BIGINT NOT NULL CHECK (amount >= 0),
     note TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS sources (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     description TEXT,
     status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'running', 'paused')),
     compliance TEXT NOT NULL DEFAULT 'review' CHECK (compliance IN ('verified', 'review', 'blocked')))`,
  `CREATE TABLE IF NOT EXISTS talk_usage (
     day DATE NOT NULL,
     id_hash TEXT NOT NULL,
     n INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (day, id_hash))`,
  `CREATE TABLE IF NOT EXISTS talk_spend (
     day DATE PRIMARY KEY,
     cost_vnd DOUBLE PRECISION NOT NULL DEFAULT 0,
     ledger_id INTEGER)`,
  `INSERT INTO sources (id, name, description, status, compliance) VALUES
     ('own-services', 'Dịch vụ tự làm', 'Viết content, landing page, trả lời khách giúp shop', 'planned', 'verified'),
     ('affiliate', 'Affiliate chính thức', 'Giới thiệu phần mềm và sản phẩm số qua chương trình affiliate công khai', 'planned', 'verified'),
     ('content', 'Video và bài viết', 'Video ngắn, blog, nhận quảng cáo có gắn nhãn tài trợ', 'planned', 'verified'),
     ('self-host', 'Công cụ tự vận hành', 'Công cụ mã nguồn mở chạy trên máy chủ thuê, tuân thủ giấy phép', 'planned', 'review'),
     ('reseller', 'Đại lý ủy quyền', 'Bán gói phần mềm qua kênh đối tác có hợp đồng', 'planned', 'review')
   ON CONFLICT (id) DO NOTHING`,
];

let ready: Promise<void> | null = null;
export function db() {
  if (!url) throw new Error("Thiếu DATABASE_URL: thêm Neon cho project trên Vercel");
  ready ??= (async () => { for (const q of SCHEMA) await sql.unsafe(q); })().catch((e) => { ready = null; throw e; });
  return ready.then(() => sql);
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export const isAdmin = (request: Request) =>
  !!env.ADMIN_TOKEN && (request.headers.get("authorization") ?? "") === `Bearer ${env.ADMIN_TOKEN}`;

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const clampLimit = (request: Request, fallback: number, max: number) =>
  Math.min(max, Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || fallback));
