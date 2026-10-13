import { requireUser } from "@/lib/auth";
import { ChatSchema, saveChat } from "@/lib/chat-store";
import { db } from "@/lib/db";
import { parseBody } from "@/lib/request";

export async function PUT(req: Request, ctx: RouteContext<"/api/chats/[id]">) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  const parsed = await parseBody(req, ChatSchema);
  if ("response" in parsed) return parsed.response;
  if (parsed.data.id !== id) return Response.json({ error: "Invalid request." }, { status: 400 });
  const result = saveChat(auth.user.id, parsed.data);
  if (result === "forbidden") return Response.json({ error: "Not allowed." }, { status: 403 });
  return Response.json({ result });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/chats/[id]">) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  db().prepare("DELETE FROM chats WHERE id = ? AND user_id = ?").run(id, auth.user.id);
  return Response.json({ ok: true });
}
