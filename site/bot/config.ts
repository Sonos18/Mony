// Cấu hình bot, đọc từ biến môi trường của project trên Vercel.
export const config = {
  // Mặc định gọi thẳng OpenAI, trong hạn mức token miễn phí mỗi ngày khi tổ chức bật chia sẻ dữ liệu:
  // 250 nghìn token cho nhóm gpt-5.4, 2,5 triệu token cho nhóm mini. Hết phần của model chính trong ngày
  // thì chuyển sang model dự phòng để không bị tính tiền.
  llm: {
    baseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "",
    model: process.env.LLM_MODEL ?? "gpt-5.4",
    dailyTokens: Number(process.env.LLM_DAILY_TOKENS ?? 230_000),
    fallbackModel: process.env.LLM_FALLBACK_MODEL ?? "gpt-5.4-mini",
    fallbackDailyTokens: Number(process.env.LLM_FALLBACK_DAILY_TOKENS ?? 2_300_000),
    // Model cho việc nhẹ như Mony nói chuyện trên trang, cùng nhóm hạn mức với model dự phòng
    lightModel: process.env.LLM_LIGHT_MODEL ?? "gpt-5.4-nano",
    lightEffort: process.env.LLM_LIGHT_EFFORT ?? "low",
    // Tuỳ chọn: cho việc nhẹ chạy ở nhà cung cấp khác có API chuẩn OpenAI (ví dụ GLM-4.7-Flash miễn phí của Z.ai)
    lightBaseUrl: process.env.LLM_LIGHT_BASE_URL ?? "",
    lightApiKey: process.env.LLM_LIGHT_API_KEY ?? "",
    // VND cho 1 triệu token. Để 0 khi còn trong hạn mức miễn phí.
    priceInPerM: Number(process.env.LLM_PRICE_IN_PER_M ?? 0),
    priceOutPerM: Number(process.env.LLM_PRICE_OUT_PER_M ?? 0),
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN ?? "",
    // Chỉ dùng khi thử trên máy với một máy chủ Telegram giả
    apiRoot: process.env.TELEGRAM_API_ROOT || undefined,
    adminIds: (process.env.TELEGRAM_ADMIN_IDS ?? "").split(",").map((s: string) => s.trim()).filter(Boolean),
  },
  // Tài khoản nhận tiền đơn hàng, giống mục Ủng hộ trên trang
  bank: {
    name: process.env.BANK_NAME ?? "Techcombank",
    account: process.env.BANK_ACCOUNT ?? "81818182222",
    holder: process.env.BANK_HOLDER ?? "NGUYEN HONG SON",
  },
  approvalThresholdVnd: Number(process.env.APPROVAL_THRESHOLD_VND ?? 2_000_000),
};
