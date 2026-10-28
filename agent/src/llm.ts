import { config } from "./config.js";
import { site } from "./site.js";

export type Message = { role: "system" | "user" | "assistant"; content: string };

// Gọi mô hình qua cổng tương thích OpenAI (LiteLLM). Mọi lượt gọi đều được ghi chi phí vào sổ cái,
// vì chi phí AI là một phần của "nguồn chi phí" mà trang công khai hiển thị.
let pendingCost = 0;

export async function chat(messages: Message[], opts: { maxTokens?: number; purpose?: string } = {}): Promise<string> {
  const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.llm.apiKey}` },
    body: JSON.stringify({ model: config.llm.model, messages, max_tokens: opts.maxTokens ?? 800 }),
  });
  if (!res.ok) throw new Error(`LLM lỗi ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };

  // LiteLLM trả chi phí thật (USD) trong header; nếu không có thì ước tính theo bảng giá trong .env.
  const usd = Number(res.headers.get("x-litellm-response-cost"));
  const usdToVnd = Number(process.env.USD_TO_VND ?? 25500);
  const u = data.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
  pendingCost += usd > 0
    ? usd * usdToVnd
    : (u.prompt_tokens * config.llm.priceInPerM + u.completion_tokens * config.llm.priceOutPerM) / 1_000_000;

  return data.choices[0]?.message.content?.trim() ?? "";
}

// Gộp chi phí nhỏ lẻ, ghi sổ cái mỗi khi đủ 1.000đ để sổ không bị ngập dòng lặt vặt.
export async function flushCost(force = false): Promise<void> {
  if (pendingCost < 1000 && !(force && pendingCost > 0)) return;
  const amount = Math.round(pendingCost);
  pendingCost = 0;
  await site.record("cost", "llm", amount, "Chi phí gọi mô hình AI");
}
