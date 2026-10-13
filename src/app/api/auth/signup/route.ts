import { z } from "zod";
import { createUser, publicUser, startSession } from "@/lib/auth";
import { db, type ClassRow, type UserRow } from "@/lib/db";
import { parseBody } from "@/lib/request";

const Body = z.object({
  role: z.enum(["student", "teacher"]),
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9._-]+$/),
  displayName: z.string().trim().min(1).max(80),
  password: z.string().min(6).max(200),
  classCode: z.string().trim().max(20).optional(),
  teacherCode: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const parsed = await parseBody(req, Body);
  if ("response" in parsed) {
    return Response.json(
      { error: "Check the form: username 3–32 letters/numbers (no spaces), password at least 6 characters." },
      { status: 400 },
    );
  }
  const { role, username, displayName, password, classCode, teacherCode } = parsed.data;
  const d = db();

  let classId: string | null = null;
  if (role === "student") {
    const cls = classCode ? (d.prepare("SELECT * FROM classes WHERE code = ?").get(classCode) as ClassRow | undefined) : undefined;
    if (!cls) return Response.json({ error: "Class code not found. Ask your teacher for the code." }, { status: 400 });
    classId = cls.id;
  } else {
    // One-time code made by an admin on /admin.
    const invite = teacherCode?.trim()
      ? d.prepare("SELECT code FROM invite_codes WHERE code = ? AND used_by IS NULL").get(teacherCode.trim())
      : undefined;
    if (!invite) return Response.json({ error: "This teacher sign-up code is wrong or has already been used." }, { status: 403 });
  }

  if (d.prepare("SELECT 1 FROM users WHERE username = ?").get(username)) {
    return Response.json({ error: "That username is taken. Try another one." }, { status: 409 });
  }
  const id = createUser({ role, username, displayName, password, classId });
  if (role === "teacher") {
    d.prepare("UPDATE invite_codes SET used_by = ?, used_at = ? WHERE code = ?").run(id, new Date().toISOString(), teacherCode!.trim());
  }
  await startSession(id);
  const user = d.prepare("SELECT id, role, username, display_name, class_id, is_admin, created_at FROM users WHERE id = ?").get(id) as unknown as UserRow;
  return Response.json({ user: publicUser(user) });
}
