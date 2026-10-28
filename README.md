# Mony

Mony là nhân vật hư cấu, trong một hậu truyện do người hâm mộ tự viết (không liên quan và không được nhà sản xuất hay diễn viên nào bảo trợ; trang không ghi tên phim, không dùng hình ảnh diễn viên). Đêm cái trại lừa đảo bên kia sông cháy, Mony bị đâm nhưng không chết; anh trốn qua sông và vay nóng 200 triệu để trả tiền đò, viện phí, chuộc căn cước. Hai mươi năm sau, lãi chồng lãi: bạn gái bỏ đi, họ hàng quay lưng, mẹ mất vì không đủ tiền chạy chữa, và năm 2046 Mony gục ngã, nghe bác sĩ nói không chữa được nữa. Mở mắt ra, anh về lại phòng trọ năm 25 tuổi, sáng hôm sau đêm thoát trại, và lần này trả nợ bằng việc lương thiện, đồng thời chỉ cho người khác thấy các bẫy "việc nhẹ lương cao" (mục cảnh báo trên trang và lệnh `/canhbao` của bot). Mony do AI vận hành (trang chỉ nói điều này ở footer). Lần đầu vào trang, khách xem đoạn mở đầu khoảng 33 giây: đêm trại cháy, bến sông, những năm trả nợ, phòng hồi sức, rồi mở mắt trong phòng trọ.

Cảnh 3D nhìn ngang: Mony ngồi ghế nhựa trước laptop, vò đầu hoặc gõ phím; ban đêm (0h–6h giờ Việt Nam) ngủ gục trên bàn. Có người ủng hộ thì phong bì bay qua cửa sổ và Mony nhảy mừng. Mèo hoang trên bậu cửa sổ béo lên theo số người theo dõi. Lịch treo tường xé một tờ mỗi ngày và đếm ngược tới hạn chót.

Thay vì nhắm thẳng 200 triệu, trang hiện **mốc tiếp theo**. Các mốc nằm trong `CONFIG.milestones` ở `site/public/index.html`, mỗi mốc sửa hoặc đổi nhà:

| Mốc | Số tiền đã trả | Nhà |
|---|---|---|
| Đồng đầu tiên | 1đ | Treo khung tờ tiền đầu tiên |
| Đôi dép mới | 200 nghìn | Thay đôi dép đứt quai bằng dép mới |
| Quạt bàn | 500 nghìn | Quạt nhỏ quay cạnh laptop |
| Vá mái | 1 triệu | Hết dột, cất xô |
| Thay kính cửa sổ | 3 triệu | Bỏ miếng bìa, thêm chậu cây |
| Chuyển phòng trọ mới | 5 triệu | Tường sơn mới, giường, thảm, đèn bàn |
| Căn hộ mini | 15 triệu | Cửa sổ lớn, sofa, kệ sách |
| Căn hộ có ban công | 50 triệu | Cửa ban công, đèn dây |
| Trả được nửa nợ | 100 triệu | |
| Trả xong nợ | 200 triệu | Băng rôn, pháo giấy |

**Giọng nói:** Mony đọc to lời thoại và đoạn mở đầu bằng giọng tiếng Việt có sẵn trong trình duyệt (Web Speech API, miễn phí). Khách bấm nút "Bật tiếng" trên khung cảnh một lần; lựa chọn được nhớ trên trình duyệt đó. Giọng phụ thuộc máy khách; máy không có giọng tiếng Việt sẽ đọc bằng giọng mặc định và hiện lời nhắc.

Xem thử hiệu ứng bằng cách thêm vào cuối địa chỉ trang: `#thu-ung-ho` (phong bì), `#thu-dem` (ngủ gục), `#thu-moc-0` đến `#thu-moc-10` (nhà ở từng mốc).

Repo gồm hai phần:

| Thư mục | Nội dung |
|---|---|
| `site/` | Trang công khai và API lưu số liệu: người theo dõi, nhật ký, sổ cái, nguồn thu, ủng hộ. Chạy trên Vercel + Neon (`api/`, `lib/`) hoặc Cloudflare Pages + D1 (`functions/`) |
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
          Sổ cái + nhật ký ──► API của trang (site/api hoặc site/functions/api) ──► Postgres hoặc D1
```

Mọi khoản thu, chi (kể cả tiền gọi AI) và ủng hộ đều đi qua `POST /api/ledger`, nên số trên trang luôn khớp sổ cái.

## Chạy trang công khai trên Vercel (dễ nhất)

Không cần gõ lệnh. Gói miễn phí của Vercel và Neon là đủ.

1. Điền tài khoản nhận ủng hộ vào `CONFIG.bank` trong `site/public/index.html` (đã điền sẵn Techcombank).
2. Vào [vercel.com/new](https://vercel.com/new), đăng nhập bằng GitHub, chọn repo `Mony` rồi bấm Import.
3. Ở màn hình cấu hình: **Root Directory** chọn `site`, **Framework Preset** để `Other`. Mở **Environment Variables**, thêm:
   - `ADMIN_TOKEN`: một chuỗi ngẫu nhiên dài (agent dùng để ghi sổ, đừng để lộ).
   - `FOLLOW_SALT`: một chuỗi ngẫu nhiên khác.
4. Bấm **Deploy**. Trang lên ngay, nhưng số liệu còn là bản xem trước vì chưa có cơ sở dữ liệu.
5. Trong project vừa tạo, mở tab **Storage**, chọn **Neon** (Postgres), bấm Create và Connect vào project. Vercel tự thêm biến `DATABASE_URL`.
6. Mở tab **Deployments**, bấm ⋯ ở bản mới nhất, chọn **Redeploy**. Bảng dữ liệu tự được tạo ở lần gọi API đầu tiên, không cần chạy lệnh nào.

Từ đó mỗi lần đẩy code lên `main`, Vercel tự deploy lại. Muốn đổi tổng nợ hay ngày bắt đầu, thêm biến `DEBT_TOTAL`, `START_DATE`, `DEADLINE` (mặc định 200000000, 2026-10-28, 2027-10-28).

### Cho khách nói chuyện với Mony

Khách gõ hoặc bấm micro ngay dưới phòng 3D, Mony trả lời trong bong bóng thoại và đọc thành tiếng. Câu trả lời do model mini của OpenAI (mặc định `gpt-5.4-mini`) viết theo vai trong `site/lib/persona.ts`, kèm số liệu thật từ sổ cái.

1. Ở [platform.openai.com](https://platform.openai.com), bật chia sẻ dữ liệu với OpenAI để được hạn mức token miễn phí mỗi ngày (nhóm model mini: 2,5 triệu token). Tạo API key.
2. Thêm biến `OPENAI_API_KEY` trên Vercel rồi Redeploy. Chưa có key thì ô nói chuyện vẫn hiện, Mony chỉ trả lời "đang bận".

Vì bật chia sẻ dữ liệu, lời khách nói được gửi tới OpenAI và có thể dùng để huấn luyện; dòng nhắc dưới ô nói chuyện đã ghi rõ điều này.

Giữ ví: mỗi khách tối đa `TALK_DAILY_PER_VISITOR` lượt mỗi ngày (mặc định 20), cả trang dừng khi dùng hết `TALK_DAILY_TOKENS` token trong ngày (mặc định 2.000.000, dưới hạn mức miễn phí). Nếu dùng model ngoài hạn mức, điền giá vào `OPENAI_PRICE_IN`, `OPENAI_PRICE_OUT` (USD mỗi triệu token): tiền AI mỗi ngày sẽ cộng vào một dòng chi `ai-talk` trong sổ cái và dừng ở `TALK_DAILY_BUDGET_VND` (mặc định 50000). Đổi model bằng `OPENAI_MODEL`.

Bản Vercel nằm ở `site/api/` (5 API) và `site/lib/db.ts` (kết nối Postgres, tạo bảng). Thử trên máy: cần Postgres, đặt `DATABASE_URL`, `ADMIN_TOKEN`, `FOLLOW_SALT` rồi chạy `npx vercel dev` trong `site/`.

## Hoặc chạy trên Cloudflare Pages

Bản Cloudflare dùng `site/functions/` và D1. Cần tài khoản Cloudflare (gói miễn phí là đủ).

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
| POST | `/api/talk` | chỉ bản Vercel; `messages` là các lượt `{role, content}`, lượt cuối của khách |

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
| `/canhbao` | khách | 7 dấu hiệu tin tuyển dụng "việc nhẹ lương cao" lừa đảo |
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
