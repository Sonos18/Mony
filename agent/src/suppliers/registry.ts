import { affiliate } from "./affiliate.js";
import { ownServices } from "./own-services.js";
import type { Product, SupplierAdapter } from "./types.js";

// Sổ đăng ký nguồn. Thêm nguồn mới: import adapter rồi thêm vào mảng.
// Nguồn tài khoản AI dùng chung đã bị loại khỏi dự án (quyết định 28/10/2026) và không được thêm lại.
export const suppliers: SupplierAdapter[] = [ownServices, affiliate];

export async function catalog(): Promise<Array<Product & { supplierId: string }>> {
  const lists = await Promise.all(
    suppliers.map(async (s) => (await s.listProducts()).map((p) => ({ ...p, supplierId: s.id })))
  );
  return lists.flat();
}

export function supplierFor(id: string): SupplierAdapter {
  const s = suppliers.find((x) => x.id === id);
  if (!s) throw new Error(`Không có nguồn ${id}`);
  return s;
}
