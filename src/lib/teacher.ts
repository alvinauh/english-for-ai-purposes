import type { UserRow } from "./db";
import { db, type ClassRow } from "./db";
import { exchanges, type LabChat } from "./lab-chat";

// Queries behind the teacher dashboard. A teacher only sees classes they created; an admin sees every class.

export function teacherClass(viewer: UserRow, classId: string): ClassRow | null {
  return (
    (db()
      .prepare("SELECT * FROM classes WHERE id = ? AND (teacher_id = ? OR ?)")
      .get(classId, viewer.id, viewer.is_admin ? 1 : 0) as ClassRow | undefined) ?? null
  );
}

/** A student in one of this teacher's classes (any class for an admin), or null. */
export function teacherStudent(viewer: UserRow, studentId: string): (UserRow & { class_name: string }) | null {
  const row = db()
    .prepare(
      `SELECT u.id, u.role, u.username, u.display_name, u.class_id, u.is_admin, u.created_at, c.name AS class_name
       FROM users u JOIN classes c ON c.id = u.class_id
       WHERE u.id = ? AND u.role = 'student' AND (c.teacher_id = ? OR ?)`,
    )
    .get(studentId, viewer.id, viewer.is_admin ? 1 : 0);
  return (row as (UserRow & { class_name: string }) | undefined) ?? null;
}

export function classStudents(classId: string): UserRow[] {
  return db()
    .prepare("SELECT id, role, username, display_name, class_id, is_admin, created_at FROM users WHERE class_id = ? AND role = 'student' ORDER BY display_name")
    .all(classId) as unknown as UserRow[];
}

export function studentChats(studentId: string): LabChat[] {
  const rows = db().prepare("SELECT data FROM chats WHERE user_id = ? ORDER BY updated_at DESC").all(studentId) as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as LabChat);
}

export interface StudentStats {
  chats: number;
  messages: number;
  attempts: number;
  langs: string[];
  lastActive: string | null;
  /** CRAFT score (0–5) of the student's first and latest checked message, across all chats. */
  firstCraft: number | null;
  latestCraft: number | null;
  bestCraft: number | null;
  /** Scaffold stage the most recent chat reached. */
  latestStage: string | null;
}

export function statsFor(chats: LabChat[]): StudentStats {
  const all = chats
    .flatMap((c) => exchanges(c).map((x) => ({ ...x, chat: c })))
    .sort((a, b) => a.student.at.localeCompare(b.student.at));
  const scored = all.filter((x) => x.craft);
  const newest = chats[0];
  const newestTutor = newest?.turns.findLast((t) => t.role === "tutor");
  return {
    chats: chats.length,
    messages: all.length,
    attempts: all.filter((x) => x.attemptNo).length,
    langs: [...new Set(chats.map((c) => c.lang ?? "id"))],
    lastActive: chats.reduce<string | null>((m, c) => (!m || c.updatedAt > m ? c.updatedAt : m), null),
    firstCraft: scored[0]?.craft?.score ?? null,
    latestCraft: scored.at(-1)?.craft?.score ?? null,
    bestCraft: scored.length ? Math.max(...scored.map((x) => x.craft!.score)) : null,
    latestStage: newestTutor?.role === "tutor" ? newestTutor.result.stage : null,
  };
}
