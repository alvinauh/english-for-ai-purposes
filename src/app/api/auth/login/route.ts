import { z } from "zod";
import { publicUser, startSession, verifyPassword } from "@/lib/auth";
import { db, type UserRow } from "@/lib/db";
import { parseBody } from "@/lib/request";

const Body = z.object({ username: z.string().trim().min(1).max(32), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const parsed = await parseBody(req, Body);
  if ("response" in parsed) return parsed.response;
  const { username, password } = parsed.data;
  const row = db().prepare("SELECT * FROM users WHERE username = ?").get(username) as (UserRow & { password_hash: string }) | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) {
    return Response.json({ error: "Wrong username or password." }, { status: 401 });
  }
  await startSession(row.id);
  return Response.json({ user: publicUser(row) });
}
