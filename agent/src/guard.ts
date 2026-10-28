import { config } from "./config.js";
import type { Product, SupplierAdapter } from "./suppliers/types.js";

// Lớp kiểm soát: chạy trước mọi lệnh chào bán và giao hàng.
const BLOCKED_TAGS = ["shared-account", "account-resale", "credential"];

export type Verdict = { ok: true } | { ok: false; why: string } | { ok: "needs_human"; why: string };

export function canOffer(p: Product, s: SupplierAdapter, amountVnd: number): Verdict {
  if (s.compliance !== "verified") return { ok: false, why: `nguồn ${s.id} chưa được duyệt` };
  if (p.tags.some((t) => BLOCKED_TAGS.includes(t))) return { ok: false, why: `SKU ${p.sku} thuộc nhóm bị cấm` };
  if (amountVnd > config.approvalThresholdVnd) return { ok: "needs_human", why: "vượt ngưỡng cần người duyệt" };
  return { ok: true };
}

// Giới hạn tin nhắn để không bị nền tảng coi là spam: mỗi người tối đa 20 tin trong 10 phút.
const hits = new Map<string, number[]>();
export function allowMessage(userId: string, now = Date.now()): boolean {
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(userId, recent);
  return recent.length <= 20;
}
