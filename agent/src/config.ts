function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Thiếu biến môi trường ${name} (xem .env.example)`);
  return v;
}

export const config = {
  // Mặc định gọi thẳng OpenAI, trong hạn mức token miễn phí mỗi ngày khi tổ chức bật chia sẻ dữ liệu:
  // 250 nghìn token cho nhóm gpt-5.4, 2,5 triệu token cho nhóm mini. Hết phần của model chính trong ngày
  // thì chuyển sang model dự phòng để không bị tính tiền.
  llm: {
    baseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: need("LLM_API_KEY"),
    model: process.env.LLM_MODEL ?? "gpt-5.4",
    dailyTokens: Number(process.env.LLM_DAILY_TOKENS ?? 230_000),
    fallbackModel: process.env.LLM_FALLBACK_MODEL ?? "gpt-5.4-mini",
    fallbackDailyTokens: Number(process.env.LLM_FALLBACK_DAILY_TOKENS ?? 2_300_000),
    // VND cho 1 triệu token, chỉ dùng khi cổng không trả chi phí. Để 0 khi còn trong hạn mức miễn phí.
    priceInPerM: Number(process.env.LLM_PRICE_IN_PER_M ?? 0),
    priceOutPerM: Number(process.env.LLM_PRICE_OUT_PER_M ?? 0),
  },
  site: {
    url: need("SITE_URL").replace(/\/$/, ""),
    adminToken: need("SITE_ADMIN_TOKEN"),
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN ?? "",
    adminIds: (process.env.TELEGRAM_ADMIN_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  },
  approvalThresholdVnd: Number(process.env.APPROVAL_THRESHOLD_VND ?? 2_000_000),
  dataDir: process.env.DATA_DIR ?? "./data",
  startDate: process.env.START_DATE ?? "2026-10-28",
};
