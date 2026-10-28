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

Cả trang lẫn bot nằm trong thư mục `site/` và chạy chung một project Vercel:

| Thư mục | Nội dung |
|---|---|
| `site/public/`, `site/api/`, `site/lib/` | Trang công khai và API lưu số liệu: người theo dõi, nhật ký, sổ cái, nguồn thu, ủng hộ. Chạy trên Vercel + Neon |
| `site/bot/` | Bot Telegram bán dịch vụ: lớp kiểm soát, các nguồn hàng dạng adapter, đơn hàng, ghi chi phí AI và nhật ký hằng ngày. Chạy cùng project Vercel qua webhook `site/api/telegram.ts` |
| `site/functions/` | Bản API cũ cho Cloudflare Pages + D1 (chỉ có trang, không có bot) |

Nguồn bán tài khoản AI đã bị loại khỏi dự án (quyết định ngày 28/10/2026). Lớp kiểm soát chặn mọi SKU gắn nhãn `shared-account`, `account-resale`, `credential`.

## Kiến trúc

```
Telegram ──► /api/telegram (webhook) ──► Bot (persona Mony) ──► Mô hình GPT (API chính thức của OpenAI)
                 │
                 ▼
          Lớp kiểm soát (guard.ts) ──► Sổ đăng ký nguồn (suppliers/registry.ts)
                 │                        ├─ own-services: dịch vụ tự làm
                 ▼                        └─ affiliate: link giới thiệu chính thức
          Sổ cái, nhật ký, đơn hàng ──► Postgres (Neon), cùng cơ sở dữ liệu với trang
```

Mọi khoản thu, chi (kể cả tiền gọi AI nếu có) và ủng hộ đều ghi vào bảng `ledger`, nên số trên trang luôn khớp sổ cái.

## Chạy trang công khai trên Vercel (dễ nhất)

Không cần gõ lệnh. Gói miễn phí của Vercel và Neon là đủ.

1. Điền tài khoản nhận ủng hộ vào `CONFIG.bank` trong `site/public/index.html` (đã điền sẵn Techcombank).
2. Vào [vercel.com/new](https://vercel.com/new), đăng nhập bằng GitHub, chọn repo `Mony` rồi bấm Import.
3. Ở màn hình cấu hình: **Root Directory** chọn `site`, **Framework Preset** để `Other`. Mở **Environment Variables**, thêm:
   - `ADMIN_TOKEN`: một chuỗi ngẫu nhiên dài (dùng để ghi sổ và bật bot, đừng để lộ).
   - `FOLLOW_SALT`: một chuỗi ngẫu nhiên khác.
4. Bấm **Deploy**. Trang lên ngay, nhưng số liệu còn là bản xem trước vì chưa có cơ sở dữ liệu.
5. Trong project vừa tạo, mở tab **Storage**, chọn **Neon** (Postgres), bấm Create và Connect vào project. Vercel tự thêm biến `DATABASE_URL`.
6. Mở tab **Deployments**, bấm ⋯ ở bản mới nhất, chọn **Redeploy**. Bảng dữ liệu tự được tạo ở lần gọi API đầu tiên, không cần chạy lệnh nào.

Từ đó mỗi lần đẩy code lên `main`, Vercel tự deploy lại. Muốn đổi tổng nợ hay ngày bắt đầu, thêm biến `DEBT_TOTAL`, `START_DATE`, `DEADLINE` (mặc định 200000000, 2026-10-28, 2027-10-28).

Bản Vercel nằm ở `site/api/` (API của trang và webhook bot), `site/bot/` (bot) và `site/lib/db.ts` (kết nối Postgres, tạo bảng). Thử trên máy: cần Postgres, đặt `DATABASE_URL`, `ADMIN_TOKEN`, `FOLLOW_SALT` rồi chạy `npx vercel dev` trong `site/`.

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

## Bật bot Telegram

Bot chạy ngay trong project Vercel của trang, không cần máy riêng. Mỗi tin Telegram gọi một hàm, gói free (1 triệu lượt mỗi tháng) dư sức.

1. Trên Telegram, nhắn [@BotFather](https://t.me/BotFather) lệnh `/newbot` để lấy token bot. Nhắn [@userinfobot](https://t.me/userinfobot) để biết ID Telegram của bạn.
2. Trên Vercel, vào **Settings → Environment Variables** của project, thêm:
   - `TELEGRAM_BOT_TOKEN`: token vừa lấy.
   - `TELEGRAM_ADMIN_IDS`: ID Telegram của chủ trang (nhiều người thì cách nhau dấu phẩy).
   - `OPENAI_API_KEY`: key OpenAI (nếu chưa có).
   - `CRON_SECRET`: một chuỗi ngẫu nhiên, để chỉ cron của Vercel gọi được việc viết nhật ký.
3. Redeploy, rồi mở trên trình duyệt: `https://<tên-miền>/api/telegram?setup=<ADMIN_TOKEN>`. Thấy `"ok": true` là Telegram đã nối vào trang.

Mô hình: mặc định gọi thẳng OpenAI bằng `gpt-5.4`. Bật chia sẻ dữ liệu ở platform.openai.com thì mỗi ngày có hạn mức token miễn phí (250 nghìn token cho nhóm gpt-5.4, 2,5 triệu cho nhóm mini). Bot đếm token trong ngày ở bảng `llm_usage`: dùng gần hết phần của `gpt-5.4` thì chuyển sang `gpt-5.4-mini`, hết cả hai thì nghỉ đến hôm sau, nên không phát sinh tiền. Đổi các mức này bằng `LLM_MODEL`, `LLM_DAILY_TOKENS`, `LLM_FALLBACK_MODEL`, `LLM_FALLBACK_DAILY_TOKENS`; nếu chấp nhận trả tiền, điền giá VND mỗi triệu token vào `LLM_PRICE_IN_PER_M`, `LLM_PRICE_OUT_PER_M` để chi phí tự vào sổ cái. Lưu ý: khi bật chia sẻ dữ liệu, yêu cầu của khách gửi qua bot có thể được OpenAI dùng để huấn luyện, nên nói rõ với khách và đừng nhận tài liệu mật. Muốn dùng nhà cung cấp khác thì trỏ `LLM_BASE_URL` tới endpoint tương thích OpenAI.

Lưu ý điều khoản: gói Hobby của Vercel dành cho dùng cá nhân, phi thương mại. Bot bán dịch vụ là dùng thương mại, nên Vercel có quyền hạn chế project; khi có doanh thu đều thì nên lên gói Pro hoặc chuyển bot sang nơi cho phép dùng thương mại.

Khách dùng nút bấm: nút "📋 Danh mục" và "⚠️ Cảnh báo lừa đảo" luôn nằm dưới ô chat; trong danh mục, bấm một món để xem chi tiết, bấm "Đặt" rồi nhắn yêu cầu là có đơn kèm thông tin chuyển khoản. Chủ trang nhận tin báo đơn mới có nút "✅ Đã nhận tiền, làm đơn". Sau khi thêm tính năng nút bấm, mở lại link `/api/telegram?setup=<ADMIN_TOKEN>` một lần để Telegram gửi cả sự kiện bấm nút.

Lệnh Telegram (vẫn dùng được khi gõ tay):

| Lệnh | Ai dùng | Việc |
|---|---|---|
| `/danhmuc` | khách | xem sản phẩm đã qua lớp kiểm soát |
| `/canhbao` | khách | 7 dấu hiệu tin tuyển dụng "việc nhẹ lương cao" lừa đảo |
| `/mua <sku> <yêu cầu>` | khách | tạo đơn, nhận mã đơn để ghi vào nội dung chuyển khoản |
| `/xacnhan <mã đơn>` | chủ trang | xác nhận đã nhận tiền, bot làm và giao sản phẩm, ghi doanh thu |
| `/hoantien <mã đơn> <lý do>` | chủ trang | ghi khoản hoàn tiền |
| `/ungho <số tiền> <lời nhắn>` | chủ trang | ghi khoản ủng hộ đã về tài khoản |

Bot tự viết nhật ký lúc 21:00 giờ Việt Nam mỗi ngày từ số liệu thật (cron của Vercel gọi `/api/cron-diary`; gói free chạy một lần mỗi ngày, có thể lệch trong vòng một giờ). Ngày nào đã có nhật ký thì bỏ qua.

## Mony nói chuyện với khách trên trang

Ô "Nói với Mony" dưới khung cảnh gọi `/api/talk`. Mony trả lời bằng tiếng Anh như nhân vật trong phim, kèm phụ đề tiếng Việt, và đọc câu tiếng Anh bằng giọng có sẵn của máy (máy nào cũng có giọng tiếng Anh). Khách gõ hoặc nói tiếng Việt đều được.

- Mặc định dùng `gpt-5.4-nano` với mức suy luận thấp, chung hạn mức miễn phí 2,5 triệu token/ngày của nhóm model nhỏ với bot, dùng chung `OPENAI_API_KEY`. Hết hạn mức thì Mony nghỉ đến hôm sau.
- Mỗi khách tối đa 20 lượt mỗi ngày (`TALK_DAILY_PER_VISITOR`).
- Muốn chạy bằng model miễn phí khác có API chuẩn OpenAI, ví dụ GLM-4.7-Flash của Z.ai, thêm trên Vercel: `LLM_LIGHT_BASE_URL=https://api.z.ai/api/paas/v4`, `LLM_LIGHT_API_KEY=<key z.ai>`, `LLM_LIGHT_MODEL=glm-4.7-flash`. Lưu ý dữ liệu khách khi đó gửi sang máy chủ của Z.ai, và cần sửa dòng ghi chú dưới ô nói chuyện trong `public/index.html` cho đúng.

## Thêm nguồn kiếm tiền

1. Tạo `site/bot/suppliers/<ten>.ts` theo giao diện `SupplierAdapter` trong `types.ts`.
2. Đặt `compliance: "verified"` chỉ khi nguồn đã được kiểm tra điều khoản. Nguồn `review` hoặc `blocked` không được chào bán.
3. Thêm adapter vào mảng `suppliers` trong `registry.ts`.
4. Thêm dòng tương ứng vào bảng `sources` (trong `site/lib/db.ts`) để trang hiển thị.

## Việc nên làm tiếp

- Thay `/xacnhan` thủ công bằng webhook ngân hàng (Casso, PayOS) gọi `/api/ledger`.
- Thêm adapter cho mô hình tự host và đại lý ủy quyền khi đã có hợp đồng.
- Nếu muốn dùng elizaOS hay CrewAI, giữ nguyên `suppliers/`, `guard.ts`, `store.ts` và chỉ thay `channels/`.

## Lưu ý

Đây là dự án thử nghiệm, không phải lời hứa thu nhập. Hãy kê khai thuế với doanh thu online và tuân thủ Luật Bảo vệ dữ liệu cá nhân khi lưu thông tin khách.
