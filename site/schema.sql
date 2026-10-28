-- Cơ sở dữ liệu D1 cho trang "Khải 2046"
CREATE TABLE IF NOT EXISTS followers (
  id_hash TEXT PRIMARY KEY,          -- sha256(ip + salt), không lưu IP thật
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS diary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day INTEGER NOT NULL,              -- ngày thứ mấy kể từ khi xuyên về
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  mood TEXT,                         -- vui, lo, quyết tâm...
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Mọi đồng tiền vào ra đều ghi ở đây. amount tính bằng VND, luôn dương.
CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'cost', 'donation')),
  source TEXT NOT NULL,              -- id nguồn thu, hoặc 'llm', 'server', 'donate'
  amount INTEGER NOT NULL CHECK (amount >= 0),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'running', 'paused')),
  compliance TEXT NOT NULL DEFAULT 'review' CHECK (compliance IN ('verified', 'review', 'blocked'))
);

INSERT OR IGNORE INTO sources (id, name, description, status, compliance) VALUES
  ('own-services', 'Dịch vụ tự làm', 'Viết content, landing page, trợ lý CSKH cho shop, chạy trên API chính thức', 'planned', 'verified'),
  ('affiliate', 'Affiliate chính thức', 'Giới thiệu công cụ AI và sản phẩm số qua chương trình affiliate công khai', 'planned', 'verified'),
  ('content', 'Video và bài viết', 'Video ngắn, blog, nhận quảng cáo có gắn nhãn tài trợ', 'planned', 'verified'),
  ('self-host', 'API mô hình tự host', 'Mô hình mã nguồn mở chạy trên GPU thuê, tuân thủ giấy phép', 'planned', 'review'),
  ('reseller', 'Đại lý ủy quyền', 'Bán gói tích hợp AI qua kênh đối tác đám mây có hợp đồng', 'planned', 'review');
