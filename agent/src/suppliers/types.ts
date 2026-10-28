// Hợp đồng chung cho mọi nguồn hàng. Thêm nguồn mới = viết một lớp theo giao diện này
// rồi đăng ký trong registry.ts. Agent không bao giờ gọi thẳng nhà cung cấp.

export type Compliance = "verified" | "review" | "blocked";

export interface Product {
  sku: string;
  name: string;
  description: string;
  priceVnd: number;
  costVnd: number;          // giá vốn ước tính (token, phí nền tảng...)
  tags: string[];
}

export interface Quote {
  sku: string;
  qty: number;
  totalVnd: number;
  costVnd: number;
}

export interface Delivery {
  orderId: string;
  message: string;          // nội dung gửi khách: link, file, hướng dẫn
}

export interface SupplierAdapter {
  id: string;
  name: string;
  compliance: Compliance;
  listProducts(): Promise<Product[]>;
  quote(sku: string, qty: number): Promise<Quote>;
  fulfill(orderId: string, sku: string, brief: string): Promise<Delivery>;
  refund(orderId: string, reason: string): Promise<void>;
  health(): Promise<{ ok: boolean; note?: string }>;
}
