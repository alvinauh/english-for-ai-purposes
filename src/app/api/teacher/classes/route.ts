import { randomUUID } from "node:crypto";
import { z } from "zod";
import { newClassCode, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody } from "@/lib/request";

export async function GET() {
  const auth = await requireUser("teacher");
  if ("response" in auth) return auth.response;
  // Admins see every teacher's classes, with the teacher's name.
  const classes = db()
    .prepare(
      `SELECT c.id, c.name, c.code, c.created_at, t.display_name AS teacher, c.teacher_id = ? AS mine,
         (SELECT COUNT(*) FROM users u WHERE u.class_id = c.id AND u.role = 'student') AS students
       FROM classes c JOIN users t ON t.id = c.teacher_id
       WHERE c.teacher_id = ? OR ? ORDER BY mine DESC, c.created_at DESC`,
    )
    .all(auth.user.id, auth.user.id, auth.user.is_admin ? 1 : 0);
  return Response.json({ classes });
}

export async function POST(req: Request) {
  const auth = await requireUser("teacher");
  if ("response" in auth) return auth.response;
  const parsed = await parseBody(req, z.object({ name: z.string().trim().min(1).max(80) }));
  if ("response" in parsed) return parsed.response;
  const d = db();
  let code = newClassCode();
  while (d.prepare("SELECT 1 FROM classes WHERE code = ?").get(code)) code = newClassCode();
  const id = randomUUID();
  d.prepare("INSERT INTO classes (id, name, code, teacher_id, created_at) VALUES (?, ?, ?, ?, ?)").run(
    id,
    parsed.data.name,
    code,
    auth.user.id,
    new Date().toISOString(),
  );
  return Response.json({ class: { id, name: parsed.data.name, code } });
}
