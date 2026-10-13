import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { ChatSchema, chatsForUser, saveChat } from "@/lib/chat-store";
import { parseBody } from "@/lib/request";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  return Response.json({ chats: chatsForUser(auth.user.id) });
}

/** Save several chats at once (first login with chats from this browser, or importing a .json file). */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const parsed = await parseBody(req, z.object({ chats: z.array(ChatSchema).max(200) }));
  if ("response" in parsed) return parsed.response;
  const results = parsed.data.chats.map((c) => saveChat(auth.user.id, c));
  return Response.json({ saved: results.filter((r) => r === "saved").length, chats: chatsForUser(auth.user.id) });
}
