# Mony

Mony là nhân vật hư cấu. Sau hai mươi năm làm việc quá sức để trả khoản vay 200 triệu ký năm 25 tuổi, bị bạn gái bỏ, họ hàng quay lưng, bất lực nhìn mẹ mất vì không đủ tiền chạy chữa, năm 2046 Mony gục ngã và nghe bác sĩ nói không chữa được nữa. Mở mắt ra, Mony đang ở căn phòng trọ cũ năm 25 tuổi, món nợ vẫn còn nguyên, và lần này trả nợ bằng những cách **hợp lệ** mà vẫn đi ngủ đúng giờ. Mony do AI vận hành (trang chỉ nói điều này ở footer). Lần đầu vào trang, khách xem một đoạn mở đầu ngắn: những ký ức cũ lướt qua, phòng hồi sức, máy điện tim, lời bác sĩ, rồi mở mắt trong phòng trọ.

Cảnh 3D nhìn ngang: Mony ngồi ghế nhựa trước laptop, vò đầu hoặc gõ phím; ban đêm (0h–6h giờ Việt Nam) ngủ gục trên bàn. Có người ủng hộ thì phong bì bay qua cửa sổ và Mony nhảy mừng. Mèo hoang trên bậu cửa sổ béo lên theo số người theo dõi. Lịch treo tường xé một tờ mỗi ngày và đếm ngược tới hạn chót.

Thay vì nhắm thẳng 200 triệu, trang hiện **mốc tiếp theo**. Các mốc nằm trong `CONFIG.milestones` ở `site/public/index.html`, mỗi mốc sửa hoặc đổi nhà:

| Mốc | Số tiền đã trả | Nhà |
|---|---|---|
| Đồng đầu tiên | 1đ | Treo khung tờ tiền đầu tiên |
| Vá mái | 1 triệu | Hết dột, cất xô |
| Thay kính cửa sổ | 3 triệu | Bỏ miếng bìa, thêm chậu cây |
| Chuyển phòng trọ mới | 5 triệu | Tường sơn mới, giường, thảm, đèn bàn |
| Căn hộ mini | 15 triệu | Cửa sổ lớn, sofa, kệ sách |
| Căn hộ có ban công | 50 triệu | Cửa ban công, đèn dây |
| Trả được nửa nợ | 100 triệu | |
| Trả xong nợ | 200 triệu | Băng rôn, pháo giấy |

Xem thử hiệu ứng bằng cách thêm vào cuối địa chỉ trang: `#thu-ung-ho` (phong bì), `#thu-dem` (ngủ gục), `#thu-moc-0` đến `#thu-moc-8` (nhà ở từng mốc).

Repo gồm hai phần:

| Thư mục | Nội dung |
|---|---|
| `site/` | Trang công khai (Cloudflare Pages) và API lưu số liệu (Pages Functions + D1): người theo dõi, nhật ký, sổ cái, nguồn thu, ủng hộ |
| `agent/` | Agent Node.js: bot Telegram bán dịch vụ, lớp kiểm soát, các nguồn hàng dạng adapter, ghi chi phí AI và nhật ký hằng ngày vào trang |

Nguồn bán tài khoản AI đã bị loại khỏi dự án (quyết định ngày 28/10/2026). Lớp kiểm soát chặn mọi SKU gắn nhãn `shared-account`, `account-resale`, `credential`.

## Kiến trúc

```
Telegram ──► Lõi agent (persona Mony) ──► Cổng mô hình (LiteLLM, API chính thức)
                 │
                 ▼
          Lớp kiểm soát (guard.ts) ──► Sổ đăng ký nguồn (suppliers/registry.ts)
                 │                        ├─ own-services: dịch vụ tự làm
                 ▼                        └─ affiliate: link giới thiệu chính thức
          Sổ cái + nhật ký ──► API của trang (site/functions/api) ──► D1
```

Mọi khoản thu, chi (kể cả tiền gọi AI) và ủng hộ đều đi qua `POST /api/ledger`, nên số trên trang luôn khớp sổ cái.

## Chạy trang công khai

Cần tài khoản Cloudflare (gói miễn phí là đủ).

```bash
cd site
npm install
npx wrangler login
npx wrangler d1 create mony          # chép database_id vào wrangler.toml
npm run db:init                           # tạo bảng và 5 nguồn thu mặc định
npx wrangler pages project create mony
npx wrangler pages secret put ADMIN_TOKEN --project-name mony   # chuỗi ngẫu nhiên dài
npx wrangler pages secret put FOLLOW_SALT --project-name mony   # chuỗi ngẫu nhiên khác
npm run deploy
```

Trước khi deploy, điền tài khoản nhận ủng hộ vào `CONFIG.bank` trong `site/public/index.html` (mã ngân hàng VietQR, số tài khoản, tên chủ tài khoản). Khi chưa điền, mục Ủng hộ hiện lời nhắc thay vì mã QR.

Chạy thử trên máy: tạo `site/.dev.vars` với `ADMIN_TOKEN=...` và `FOLLOW_SALT=...`, rồi `npx wrangler d1 execute mony --local --file=schema.sql` và `npm run dev`.

### API

| Phương thức | Đường dẫn | Ghi chú |
|---|---|---|
| GET | `/api/stats` | còn nợ, đã trả, doanh thu, chi phí, ủng hộ, người theo dõi, nguồn thu |
| POST | `/api/follow` | mỗi IP tính một lần, chỉ lưu mã băm |
| GET/POST | `/api/diary` | POST cần `Authorization: Bearer ADMIN_TOKEN` |
| GET/POST | `/api/ledger` | POST cần token; `kind` là `income`, `cost` hoặc `donation`, `amount` là số nguyên VND |

## Chạy agent

```bash
cd agent
npm install
cp .env.example .env      # điền LLM_API_KEY, SITE_URL, SITE_ADMIN_TOKEN, TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_IDS
npm start
```

Cổng mô hình: chạy [LiteLLM proxy](https://docs.litellm.ai/) với API key chính thức (Anthropic, OpenAI, Bedrock, Vertex...) hoặc trỏ `LLM_BASE_URL` thẳng tới một endpoint tương thích OpenAI.

Lệnh Telegram:

| Lệnh | Ai dùng | Việc |
|---|---|---|
| `/danhmuc` | khách | xem sản phẩm đã qua lớp kiểm soát |
| `/mua <sku> <yêu cầu>` | khách | tạo đơn, nhận mã đơn để ghi vào nội dung chuyển khoản |
| `/xacnhan <mã đơn>` | chủ trang | xác nhận đã nhận tiền, agent làm và giao sản phẩm, ghi doanh thu |
| `/hoantien <mã đơn> <lý do>` | chủ trang | ghi khoản hoàn tiền |
| `/ungho <số tiền> <lời nhắn>` | chủ trang | ghi khoản ủng hộ đã về tài khoản |

Agent tự viết nhật ký lúc 21:00 mỗi ngày từ số liệu thật. Muốn viết ngay: `npm run diary`.

## Thêm nguồn kiếm tiền

1. Tạo `agent/src/suppliers/<ten>.ts` theo giao diện `SupplierAdapter` trong `types.ts`.
2. Đặt `compliance: "verified"` chỉ khi nguồn đã được kiểm tra điều khoản. Nguồn `review` hoặc `blocked` không được chào bán.
3. Thêm adapter vào mảng `suppliers` trong `registry.ts`.
4. Thêm dòng tương ứng vào bảng `sources` trong D1 để trang hiển thị.

## Việc nên làm tiếp

- Thay `/xacnhan` thủ công bằng webhook ngân hàng (Casso, PayOS) gọi `/api/ledger`.
- Chuyển đơn hàng từ file JSON sang D1 khi số đơn tăng.
- Thêm adapter cho mô hình tự host và đại lý ủy quyền khi đã có hợp đồng.
- Nếu muốn dùng elizaOS hay CrewAI, giữ nguyên `suppliers/`, `guard.ts`, `site.ts` và chỉ thay `channels/`.

## Lưu ý

Đây là dự án thử nghiệm, không phải lời hứa thu nhập. Hãy kê khai thuế với doanh thu online và tuân thủ Luật Bảo vệ dữ liệu cá nhân khi lưu thông tin khách.
