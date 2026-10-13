import { z } from "zod";
import { newClassCode, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody } from "@/lib/request";

// One-time teacher sign-up codes. Each code creates one teacher account, then stops working.

export async function GET() {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;
  const invites = db()
    .prepare(
      `SELECT i.code, i.note, i.created_at, i.used_at, u.display_name AS used_by_name, u.username AS used_by_username
       FROM invite_codes i LEFT JOIN users u ON u.id = i.used_by ORDER BY i.created_at DESC`,
    )
    .all();
  return Response.json({ invites });
}

export async function POST(req: Request) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;
  const parsed = await parseBody(req, z.object({ note: z.string().trim().max(120).default("") }));
  if ("response" in parsed) return parsed.response;
  const d = db();
  let code = newClassCode(10);
  while (d.prepare("SELECT 1 FROM invite_codes WHERE code = ?").get(code)) code = newClassCode(10);
  d.prepare("INSERT INTO invite_codes (code, note, created_by, created_at) VALUES (?, ?, ?, ?)").run(
    code,
    parsed.data.note,
    auth.user.id,
    new Date().toISOString(),
  );
  return Response.json({ code });
}

/** Cancel a code that has not been used yet. */
export async function DELETE(req: Request) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;
  const code = new URL(req.url).searchParams.get("code") ?? "";
  db().prepare("DELETE FROM invite_codes WHERE code = ? AND used_by IS NULL").run(code);
  return Response.json({ ok: true });
}
