import { z } from "zod";
import { errorResponse, generate } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { projectToText, stageByKey } from "@/lib/design-thinking";
import { COACH_SYSTEM, langLine } from "@/lib/prompts";
import { FieldsSchema, LangSchema, parseBody } from "@/lib/request";
import { CoachReply } from "@/lib/schemas";

export const maxDuration = 120;

const Body = z.object({
  lang: LangSchema,
  stage: z.enum(["empathize", "define", "ideate", "prototype", "test"]),
  fields: FieldsSchema,
  history: z
    .array(z.object({ role: z.enum(["student", "coach"]), text: z.string().max(4000) }))
    .max(40),
  message: z.string().min(1).max(4000),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const parsed = await parseBody(req, Body);
  if ("response" in parsed) return parsed.response;
  const { lang, stage: stageKey, fields, history, message } = parsed.data;
  const stage = stageByKey(stageKey);

  const transcript = history
    .slice(-12)
    .map((h) => `${h.role === "student" ? "Student" : "Coach"}: ${h.text}`)
    .join("\n");

  const content = `${langLine(lang)}

Current stage: ${stage.en} — ${stage.goal_en}
Canvas fields for this stage (use these exact field_key values):
${stage.fields.map((f) => `- ${f.key}: ${f.en}`).join("\n")}

The student's canvas so far:
${projectToText(fields)}

Recent conversation:
${transcript || "(This is the first message.)"}

Student's new message:
${message}`;

  try {
    const reply = await generate({
      system: COACH_SYSTEM,
      messages: [{ role: "user", content }],
      schema: CoachReply,
      effort: "low",
      maxTokens: 8000,
    });
    // Drop suggestions for fields outside the current stage.
    const allowed = new Set(stage.fields.map((f) => f.key));
    reply.field_suggestions = reply.field_suggestions.filter((s) => allowed.has(s.field_key));
    return Response.json(reply);
  } catch (error) {
    return errorResponse(error);
  }
}
