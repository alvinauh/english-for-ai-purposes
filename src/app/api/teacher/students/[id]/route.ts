import { z } from "zod";
import { hashPassword, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody } from "@/lib/request";
import { statsFor, studentChats, teacherStudent } from "@/lib/teacher";

/** One student's full Prompt Lab chats. */
export async function GET(_req: Request, ctx: RouteContext<"/api/teacher/students/[id]">) {
  const auth = await requireUser("teacher");
  if ("response" in auth) return auth.response;
  const student = teacherStudent(auth.user, (await ctx.params).id);
  if (!student) return Response.json({ error: "Student not found." }, { status: 404 });
  const chats = studentChats(student.id);
  return Response.json({
    student: { id: student.id, username: student.username, displayName: student.display_name, className: student.class_name, classId: student.class_id },
    stats: statsFor(chats),
    chats,
  });
}

/** Set a new password for a student who forgot theirs. */
export async function POST(req: Request, ctx: RouteContext<"/api/teacher/students/[id]">) {
  const auth = await requireUser("teacher");
  if ("response" in auth) return auth.response;
  const student = teacherStudent(auth.user, (await ctx.params).id);
  if (!student) return Response.json({ error: "Student not found." }, { status: 404 });
  const parsed = await parseBody(req, z.object({ password: z.string().min(6).max(200) }));
  if ("response" in parsed) return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  const d = db();
  d.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(parsed.data.password), student.id);
  d.prepare("DELETE FROM sessions WHERE user_id = ?").run(student.id);
  return Response.json({ ok: true });
}
