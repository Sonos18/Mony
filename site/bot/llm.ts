import { config } from "./config.js";
import { addUsage, tokensToday } from "./store.js";

export type Message = { role: "system" | "user" | "assistant"; content: string };

// Gọi mô hình qua API chuẩn Chat Completions (mặc định OpenAI; LiteLLM hay cổng tương thích khác cũng được).
// Mọi lượt gọi đều được đếm token trong ngày, và nếu có giá thì chi phí được ghi vào sổ cái,
// vì chi phí AI là một phần của "nguồn chi phí" mà trang công khai hiển thị.
async function pickModel(): Promise<string> {
  const { model, dailyTokens, fallbackModel, fallbackDailyTokens } = config.llm;
  if ((await tokensToday(model)) < dailyTokens) return model;
  if (fallbackModel && (await tokensToday(fallbackModel)) < fallbackDailyTokens) return fallbackModel;
  throw new Error("Hết hạn mức token miễn phí hôm nay, mai Mony làm tiếp");
}

export async function chat(messages: Message[], opts: { maxTokens?: number } = {}): Promise<string> {
  if (!config.llm.apiKey) throw new Error("Thiếu OPENAI_API_KEY");
  const model = await pickModel();
  // Các model GPT-5 trở đi dùng max_completion_tokens (gồm cả token suy luận), không nhận max_tokens
  const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.llm.apiKey}` },
    body: JSON.stringify({ model, messages, max_completion_tokens: opts.maxTokens ?? 2000 }),
  });
  if (!res.ok) throw new Error(`LLM lỗi ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };
  const u = data.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
  const costVnd = (u.prompt_tokens * config.llm.priceInPerM + u.completion_tokens * config.llm.priceOutPerM) / 1_000_000;
  await addUsage(model, u.prompt_tokens + u.completion_tokens, costVnd);
  return data.choices[0]?.message.content?.trim() ?? "";
}
