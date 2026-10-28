function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Thiếu biến môi trường ${name} (xem .env.example)`);
  return v;
}

export const config = {
  llm: {
    baseUrl: process.env.LLM_BASE_URL ?? "http://localhost:4000/v1",
    apiKey: need("LLM_API_KEY"),
    model: process.env.LLM_MODEL ?? "claude-sonnet",
    priceInPerM: Number(process.env.LLM_PRICE_IN_PER_M ?? 75000),
    priceOutPerM: Number(process.env.LLM_PRICE_OUT_PER_M ?? 375000),
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
