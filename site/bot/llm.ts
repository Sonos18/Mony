import { config } from "./config.js";
import { addUsage, tokensToday } from "./store.js";

export type Message = { role: "system" | "user" | "assistant"; content: string };

// Gọi mô hình qua API chuẩn Chat Completions (mặc định OpenAI; LiteLLM hay cổng tương thích khác cũng được).
// Mọi lượt gọi đều được đếm token trong ngày, và nếu có giá thì chi phí được ghi vào sổ cái,
// vì chi phí AI là một phần của "nguồn chi phí" mà trang công khai hiển thị.

// Hạn mức miễn phí tính chung cho cả nhóm: model chính một nhóm, các model nhỏ (mini, nano) chung một nhóm khác
const POOL_SMALL = "small-models";
const poolOf = (model: string) => (model === config.llm.model ? model : POOL_SMALL);

async function pickModel(light?: boolean): Promise<string> {
  const { model, dailyTokens, fallbackModel, fallbackDailyTokens, lightModel } = config.llm;
  const smallLeft = (await tokensToday(POOL_SMALL)) < fallbackDailyTokens;
  // Việc nhẹ (nói chuyện trên trang) dùng model nhỏ nhất, để dành hạn mức của model chính cho việc thật
  if (light) {
    if (smallLeft) return lightModel;
  } else {
    if ((await tokensToday(model)) < dailyTokens) return model;
    if (fallbackModel && smallLeft) return fallbackModel;
  }
  throw new Error("Hết hạn mức token miễn phí hôm nay, mai Mony làm tiếp");
}

export async function chat(messages: Message[], opts: { maxTokens?: number; light?: boolean; json?: boolean } = {}): Promise<string> {
  // Việc nhẹ có nhà cung cấp riêng thì gọi thẳng đó, hạn mức do nhà cung cấp đó tự giới hạn
  const external = !!(opts.light && config.llm.lightBaseUrl && config.llm.lightApiKey);
  const baseUrl = external ? config.llm.lightBaseUrl : config.llm.baseUrl;
  const apiKey = external ? config.llm.lightApiKey : config.llm.apiKey;
  if (!apiKey) throw new Error("Thiếu OPENAI_API_KEY");
  const model = external ? config.llm.lightModel : await pickModel(opts.light);
  // Các model GPT-5 trở đi dùng max_completion_tokens (gồm cả token suy luận), không nhận max_tokens.
  // Việc nhẹ thì bớt suy luận, vì token suy luận cũng bị tính vào hạn mức.
  const body: Record<string, unknown> = {
    model, messages, max_completion_tokens: opts.maxTokens ?? 2000,
    ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    ...(opts.light && !external && config.llm.lightEffort ? { reasoning_effort: config.llm.lightEffort } : {}),
  };
  const send = () => fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  let res = await send();
  if (res.status === 400 && "reasoning_effort" in body) {
    // Model không nhận mức suy luận này thì gửi lại không kèm tham số đó
    const err = await res.text();
    if (!err.includes("reasoning")) throw new Error(`LLM lỗi 400: ${err}`);
    delete body.reasoning_effort;
    res = await send();
  }
  if (!res.ok) throw new Error(`LLM lỗi ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };
  const u = data.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
  const costVnd = (u.prompt_tokens * config.llm.priceInPerM + u.completion_tokens * config.llm.priceOutPerM) / 1_000_000;
  await addUsage(external ? model : poolOf(model), u.prompt_tokens + u.completion_tokens, costVnd);
  return data.choices[0]?.message.content?.trim() ?? "";
}
