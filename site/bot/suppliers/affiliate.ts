import type { Delivery, Product, SupplierAdapter } from "./types.js";

// Nguồn 2: affiliate chính thức. Mony không bán hàng, chỉ gửi link giới thiệu có mã của bạn.
// Hoa hồng về sau được ghi sổ cái bằng tay (hoặc qua API của mạng affiliate) với source = "affiliate".
// Điền các chương trình bạn đã được duyệt vào danh sách dưới đây.
interface AffiliateOffer { sku: string; name: string; description: string; url: string }

const OFFERS: AffiliateOffer[] = [
  // { sku: "aff-canva", name: "Canva Pro", description: "Thiết kế ảnh bán hàng", url: "https://..." },
];

export const affiliate: SupplierAdapter = {
  id: "affiliate",
  name: "Affiliate chính thức",
  compliance: "verified",
  async listProducts(): Promise<Product[]> {
    return OFFERS.map((o) => ({ sku: o.sku, name: o.name, description: o.description, priceVnd: 0, costVnd: 0, tags: ["affiliate"] }));
  },
  async quote(sku, qty) { return { sku, qty, totalVnd: 0, costVnd: 0 }; },
  async fulfill(orderId, sku): Promise<Delivery> {
    const o = OFFERS.find((x) => x.sku === sku);
    if (!o) throw new Error(`Không có ưu đãi ${sku}`);
    return { orderId, message: `Link giới thiệu (Mony nhận hoa hồng nếu bạn mua qua link này): ${o.url}` };
  },
  async refund() {},
  async health() { return { ok: OFFERS.length > 0, note: OFFERS.length ? undefined : "chưa có chương trình nào" }; },
};
