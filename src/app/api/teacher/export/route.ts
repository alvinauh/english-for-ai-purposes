import { requireUser } from "@/lib/auth";
import { studentsToCSV } from "@/lib/lab-chat";
import { classStudents, studentChats, teacherClass } from "@/lib/teacher";

/** Every exchange of every student in a class as one CSV (same columns as the student export). */
export async function GET(req: Request) {
  const auth = await requireUser("teacher");
  if ("response" in auth) return auth.response;
  const classId = new URL(req.url).searchParams.get("classId") ?? "";
  const cls = teacherClass(auth.user, classId);
  if (!cls) return Response.json({ error: "Class not found." }, { status: 404 });
  const csv = studentsToCSV(
    classStudents(cls.id).map((s) => ({ chats: studentChats(s.id), student: { name: `${s.display_name} (@${s.username})`, group: cls.name } })),
  );
  const filename = `prompt-lab-${cls.code}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` },
  });
}
