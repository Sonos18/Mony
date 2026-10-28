import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";

// Đơn hàng lưu trong một file JSON. Đủ cho giai đoạn đầu; chuyển sang D1 hoặc Postgres khi đơn nhiều.
export type OrderStatus = "awaiting_payment" | "needs_approval" | "paid" | "delivered" | "refunded";

export interface Order {
  id: string;
  chatId: number;
  supplierId: string;
  sku: string;
  qty: number;
  totalVnd: number;
  costVnd: number;
  brief: string;
  status: OrderStatus;
  createdAt: string;
}

const file = join(config.dataDir, "orders.json");

function load(): Order[] {
  try { return JSON.parse(readFileSync(file, "utf8")) as Order[]; } catch { return []; }
}
function save(all: Order[]) {
  mkdirSync(config.dataDir, { recursive: true });
  writeFileSync(file, JSON.stringify(all, null, 2));
}

export const orders = {
  create(o: Omit<Order, "id" | "createdAt">): Order {
    const all = load();
    // Mã ngắn để khách ghi vào nội dung chuyển khoản
    const order: Order = { ...o, id: "K" + Date.now().toString(36).toUpperCase().slice(-6), createdAt: new Date().toISOString() };
    all.push(order); save(all);
    return order;
  },
  get(id: string) { return load().find((o) => o.id === id.toUpperCase()); },
  setStatus(id: string, status: OrderStatus) {
    const all = load(); const o = all.find((x) => x.id === id.toUpperCase());
    if (!o) throw new Error(`Không có đơn ${id}`);
    o.status = status; save(all); return o;
  },
};
