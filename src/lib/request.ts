import { z } from "zod";

export const LangSchema = z.enum(["id", "my", "km"]).default("id");
export const FieldsSchema = z.record(z.string(), z.string().max(4000));

/** Parse a JSON body against a schema, or return a 400 Response. */
export async function parseBody<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { response: Response }> {
  const json = await req.json().catch(() => null);
  const result = schema.safeParse(json);
  if (!result.success) {
    return { response: Response.json({ error: "Invalid request." }, { status: 400 }) };
  }
  return { data: result.data };
}
