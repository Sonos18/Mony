import { config } from "./config.js";

// Client cho API của trang công khai: sổ cái và nhật ký.
export type LedgerKind = "income" | "cost" | "donation";

async function post(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${config.site.url}/api/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.site.adminToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST /api/${path} lỗi ${res.status}: ${await res.text()}`);
}

export const site = {
  record: (kind: LedgerKind, source: string, amount: number, note?: string) =>
    post("ledger", { kind, source, amount: Math.round(amount), note }),
  writeDiary: (day: number, title: string, body: string, mood?: string) =>
    post("diary", { day, title, body, mood }),
  async ledger(limit = 50) {
    const res = await fetch(`${config.site.url}/api/ledger?limit=${limit}`);
    return ((await res.json()) as { entries: Array<{ kind: LedgerKind; source: string; amount: number; note: string | null; created_at: string }> }).entries;
  },
  async stats() {
    const res = await fetch(`${config.site.url}/api/stats`);
    return (await res.json()) as { remaining: number; repaid: number; income: number; cost: number; donated: number; followers: number };
  },
};
