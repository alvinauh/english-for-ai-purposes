import { z } from "zod";

// Server-only. DeepSeek exposes an OpenAI-compatible Chat Completions API.
const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";

export const MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

type Effort = "low" | "medium" | "high";

type Message = { role: "user" | "assistant"; content: string };

class AIServiceError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/**
 * One structured call to DeepSeek. DeepSeek's JSON mode guarantees valid JSON
 * but not a shape, so the schema goes into the system prompt and the reply is
 * validated with Zod (one retry if it doesn't match).
 */
export async function generate<T extends z.ZodType>(opts: {
  system: string;
  messages: Message[];
  schema: T;
  effort?: Effort;
  maxTokens?: number;
}): Promise<z.infer<T>> {
  if (!API_KEY) throw new AIServiceError("missing key", 401);

  const jsonSchema = JSON.stringify(z.toJSONSchema(opts.schema, { io: "input" }));
  const system = `${opts.system}

Reply with a single JSON object only — no markdown, no code fences. It must match this JSON Schema exactly. Every property is required. Never use null unless that property's type explicitly allows null — if the student hasn't given enough information for a string field, write a short placeholder such as "Not decided yet" (and its translation) instead. JSON Schema:
${jsonSchema}`;

  let lastError = "";
  let lastReply = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages = [{ role: "system", content: system }, ...opts.messages];
    if (lastError) {
      messages.push({ role: "assistant", content: lastReply });
      messages.push({
        role: "user",
        content: `Your previous JSON did not match the schema (${lastError}). Reply again with corrected JSON.`,
      });
    }

    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages,
        response_format: { type: "json_object" },
        // deepseek-chat caps output at 8K tokens.
        max_tokens: Math.min(opts.maxTokens ?? 8000, 8000),
        temperature: opts.effort === "low" ? 0.7 : 0.5,
      }),
    }).catch((e) => {
      throw new AIServiceError(`network: ${e}`);
    });

    if (!res.ok) {
      console.error("DeepSeek error", res.status, await res.text().catch(() => ""));
      throw new AIServiceError(`DeepSeek ${res.status}`, res.status);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (choice?.finish_reason === "length") {
      throw new Error("The AI response was incomplete. Please try again.");
    }
    if (choice?.finish_reason === "content_filter") {
      throw new RefusalError("The AI declined this request. Try rephrasing it.");
    }

    lastReply = choice?.message?.content ?? "";
    let json: unknown;
    try {
      json = JSON.parse(lastReply);
    } catch {
      lastError = "invalid JSON";
      continue;
    }
    const parsed = opts.schema.safeParse(json);
    if (parsed.success) return parsed.data;
    lastError = parsed.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
  }
  console.error("DeepSeek schema mismatch:", lastError);
  throw new Error("The AI response was not in the expected format. Please try again.");
}

export class RefusalError extends Error {}

/** Map any error to a JSON response the client can show. */
export function errorResponse(error: unknown): Response {
  if (error instanceof RefusalError) {
    return Response.json({ error: error.message }, { status: 422 });
  }
  if (error instanceof AIServiceError) {
    if (error.status === 401) {
      return Response.json(
        { error: "Server is missing a valid DEEPSEEK_API_KEY." },
        { status: 500 },
      );
    }
    if (error.status === 402) {
      return Response.json(
        { error: "The AI account has run out of credit. Ask your teacher to top it up." },
        { status: 503 },
      );
    }
    if (error.status === 429) {
      return Response.json(
        { error: "Too many requests right now. Wait a minute and try again." },
        { status: 429 },
      );
    }
    if (error.status) {
      return Response.json({ error: `AI service error (${error.status}).` }, { status: 502 });
    }
    console.error(error);
    return Response.json(
      { error: "The AI service is not available. Ask your teacher to check the server setup." },
      { status: 503 },
    );
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  return Response.json({ error: message }, { status: 500 });
}
