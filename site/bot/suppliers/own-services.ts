import { chat } from "../llm.js";
import type { Delivery, Product, Quote, SupplierAdapter } from "./types.js";

// Nguồn 1: dịch vụ do Mony tự làm bằng API chính thức. Khách trả tiền cho kết quả, không phải cho quyền truy cập AI.
const PRODUCTS: Product[] = [
  {
    sku: "content-10",
    name: "Gói 10 bài đăng Facebook cho shop",
    description: "10 bài viết bán hàng tiếng Việt theo sản phẩm và giọng của shop, kèm gợi ý ảnh.",
    priceVnd: 99_000, costVnd: 5_000, tags: ["content"],
  },
  {
    sku: "reels-5",
    name: "5 kịch bản video ngắn",
    description: "Kịch bản TikTok hoặc Reels 30–45 giây, có câu mở đầu, lời thoại và lời kêu gọi mua hàng.",
    priceVnd: 79_000, costVnd: 4_000, tags: ["content"],
  },
  {
    sku: "landing-1",
    name: "Landing page một trang",
    description: "Trang giới thiệu sản phẩm bằng HTML, gửi file để shop tự đăng. Có bản demo trước khi thanh toán.",
    priceVnd: 299_000, costVnd: 15_000, tags: ["web"],
  },
  {
    sku: "dich-5",
    name: "Dịch 5 trang Anh ↔ Việt",
    description: "Dịch tài liệu, hợp đồng mẫu, mô tả sản phẩm giữa tiếng Anh và tiếng Việt, khoảng 5 trang A4. Mony đọc lại trước khi gửi.",
    priceVnd: 149_000, costVnd: 6_000, tags: ["translate"],
  },
  {
    sku: "email-en",
    name: "10 email tiếng Anh cho shop",
    description: "Email chào hàng, trả lời khách quốc tế, xin lỗi giao trễ... viết bằng tiếng Anh tự nhiên theo tình huống của shop.",
    priceVnd: 89_000, costVnd: 4_000, tags: ["translate", "content"],
  },
];

const PROMPTS: Record<string, string> = {
  "content-10": "Viết 10 bài đăng Facebook bán hàng bằng tiếng Việt, mỗi bài 80–150 chữ, có emoji vừa phải, mỗi bài kèm một dòng gợi ý ảnh. Thông tin shop:",
  "reels-5": "Viết 5 kịch bản video ngắn 30–45 giây bằng tiếng Việt. Mỗi kịch bản gồm: câu mở đầu 3 giây, các cảnh, lời thoại, lời kêu gọi. Thông tin sản phẩm:",
  "dich-5": "Dịch chính xác và tự nhiên văn bản sau giữa tiếng Anh và tiếng Việt (tự nhận chiều dịch). Giữ định dạng, không bỏ ý, ghi chú cuối bài những chỗ cần khách xác nhận. Văn bản:",
  "email-en": "Viết 10 email tiếng Anh tự nhiên, lịch sự cho shop theo các tình huống khách mô tả, mỗi email có tiêu đề và bản dịch tiếng Việt ngắn bên dưới. Thông tin shop:",
  "landing-1": "Viết một landing page HTML đơn giản, một file, CSS nội tuyến, tiếng Việt, tối ưu điện thoại. Thông tin sản phẩm:",
};

export const ownServices: SupplierAdapter = {
  id: "own-services",
  name: "Dịch vụ tự làm",
  compliance: "verified",
  async listProducts() { return PRODUCTS; },
  async quote(sku, qty): Promise<Quote> {
    const p = PRODUCTS.find((x) => x.sku === sku);
    if (!p) throw new Error(`Không có SKU ${sku}`);
    return { sku, qty, totalVnd: p.priceVnd * qty, costVnd: p.costVnd * qty };
  },
  async fulfill(orderId, sku, brief): Promise<Delivery> {
    const prompt = PROMPTS[sku];
    if (!prompt) throw new Error(`Không có SKU ${sku}`);
    const text = await chat([{ role: "user", content: `${prompt}\n${brief}` }], { maxTokens: 8000 });
    return { orderId, message: text };
  },
  async refund() { /* hoàn tiền làm thủ công qua ngân hàng; sổ cái ghi bằng lệnh /hoantien */ },
  async health() { return { ok: true }; },
};
