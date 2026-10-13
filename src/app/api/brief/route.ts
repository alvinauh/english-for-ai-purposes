import { z } from "zod";
import { errorResponse, generate } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { projectToText } from "@/lib/design-thinking";
import { BRIEF_SYSTEM, langLine } from "@/lib/prompts";
import { FieldsSchema, LangSchema, parseBody } from "@/lib/request";
import { ProjectBrief } from "@/lib/schemas";

export const maxDuration = 120;

const Body = z.object({ lang: LangSchema, fields: FieldsSchema });

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const parsed = await parseBody(req, Body);
  if ("response" in parsed) return parsed.response;
  const { lang, fields } = parsed.data;

  try {
    const brief = await generate({
      system: BRIEF_SYSTEM,
      messages: [
        {
          role: "user",
          content: `${langLine(lang)} In each {en, l1} pair, "l1" is that language.\n\nThe student's design-thinking canvas:\n${projectToText(fields)}`,
        },
      ],
      schema: ProjectBrief,
      effort: "medium",
    });
    return Response.json(brief);
  } catch (error) {
    return errorResponse(error);
  }
}
