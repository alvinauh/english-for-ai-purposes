import { requireUser } from "@/lib/auth";
import { classStudents, statsFor, studentChats, teacherClass } from "@/lib/teacher";

/** Students of one class with a summary of their Prompt Lab work. */
export async function GET(req: Request) {
  const auth = await requireUser("teacher");
  if ("response" in auth) return auth.response;
  const classId = new URL(req.url).searchParams.get("classId") ?? "";
  const cls = teacherClass(auth.user, classId);
  if (!cls) return Response.json({ error: "Class not found." }, { status: 404 });
  const students = classStudents(cls.id).map((s) => ({
    id: s.id,
    username: s.username,
    displayName: s.display_name,
    joinedAt: s.created_at,
    stats: statsFor(studentChats(s.id)),
  }));
  return Response.json({ class: { id: cls.id, name: cls.name, code: cls.code }, students });
}
