import { z } from "zod";
import { errorResponse, generate } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { LAB_SYSTEM, langLine } from "@/lib/prompts";
import { LangSchema, parseBody } from "@/lib/request";
import { PromptLabResult, TASK_TYPES } from "@/lib/schemas";

export const maxDuration = 120;

const TASK_LABELS: Record<(typeof TASK_TYPES)[number], string> = {
  write: "writing text or content (posts, emails, scripts, lesson materials)",
  build: "building something (a chatbot, website, app, or automation) with an AI tool",
  image: "generating an image or design",
  research: "researching, summarising or analysing information",
  learn: "learning or explaining a topic",
};

const Body = z.object({
  lang: LangSchema,
  task: z.enum(TASK_TYPES),
  briefText: z.string().max(8000).optional(),
  history: z
    .array(z.object({ role: z.enum(["student", "tutor"]), text: z.string().max(6000) }))
    .max(40),
  message: z.string().min(1).max(4000),
  kind: z.enum(["draft", "answers", "attempt", "message"]),
});

const KIND_LABELS = {
  draft: "a new prompt idea (draft)",
  answers: "answers to your clarifying questions",
  attempt: "their OWN prompt attempt, written after you asked them to try",
  message: "a chat message (could be a question, a request, or a revised prompt — decide from the content)",
};

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const parsed = await parseBody(req, Body);
  if ("response" in parsed) return parsed.response;
  const { lang, task, briefText, history, message, kind } = parsed.data;

  const parts = [
    langLine(lang),
    `What the student wants to use the prompt for: ${TASK_LABELS[task]}.`,
  ];
  if (briefText?.trim()) parts.push(`The student's project brief:\n${briefText.trim()}`);
  const transcript = history
    .slice(-14)
    .map((h) => `${h.role === "student" ? "STUDENT" : "TUTOR"}:\n${h.text}`)
    .join("\n\n---\n\n");
  parts.push(`Chat so far:\n${transcript || "(This is the first message.)"}`);
  parts.push(`The student's latest message is ${KIND_LABELS[kind]}:\n"""\n${message}\n"""`);

  try {
    const result = await generate({
      system: LAB_SYSTEM,
      messages: [{ role: "user", content: parts.join("\n\n") }],
      schema: PromptLabResult,
      effort: "medium",
    });
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
