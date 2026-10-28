import { db } from "../lib/db.js";

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

type Row = { id: string; chat_id: string; supplier_id: string; sku: string; qty: number; total_vnd: string; cost_vnd: string; brief: string; status: OrderStatus; created_at: Date };
const toOrder = (r: Row): Order => ({
  id: r.id, chatId: Number(r.chat_id), supplierId: r.supplier_id, sku: r.sku, qty: r.qty,
  totalVnd: Number(r.total_vnd), costVnd: Number(r.cost_vnd), brief: r.brief, status: r.status, createdAt: r.created_at.toISOString(),
});

export const orders = {
  async create(o: Omit<Order, "id" | "createdAt">): Promise<Order> {
    const sql = await db();
    // Mã ngắn để khách ghi vào nội dung chuyển khoản
    const id = "K" + Date.now().toString(36).toUpperCase().slice(-6);
    const [r] = await sql<Row[]>`
      INSERT INTO orders (id, chat_id, supplier_id, sku, qty, total_vnd, cost_vnd, brief, status)
      VALUES (${id}, ${o.chatId}, ${o.supplierId}, ${o.sku}, ${o.qty}, ${o.totalVnd}, ${o.costVnd}, ${o.brief}, ${o.status}) RETURNING *`;
    return toOrder(r);
  },
  async get(id: string): Promise<Order | undefined> {
    const sql = await db();
    const [r] = await sql<Row[]>`SELECT * FROM orders WHERE id = ${id.toUpperCase()}`;
    return r && toOrder(r);
  },
  async setStatus(id: string, status: OrderStatus) {
    const sql = await db();
    const [r] = await sql<Row[]>`UPDATE orders SET status = ${status} WHERE id = ${id.toUpperCase()} RETURNING *`;
    if (!r) throw new Error(`Không có đơn ${id}`);
    return toOrder(r);
  },
};
