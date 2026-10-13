import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { classStudents, statsFor, studentChats } from "@/lib/teacher";

const WEEK = 7 * 86400_000;

/** How every class on the platform is doing with the Prompt Lab. */
export async function GET() {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;
  const d = db();
  const weekAgo = new Date(Date.now() - WEEK).toISOString();
  const classes = d
    .prepare(
      `SELECT c.id, c.name, c.code, t.display_name AS teacher FROM classes c JOIN users t ON t.id = c.teacher_id ORDER BY t.display_name, c.name`,
    )
    .all() as { id: string; name: string; code: string; teacher: string }[];

  const rows = classes.map((c) => {
    const stats = classStudents(c.id).map((s) => statsFor(studentChats(s.id)));
    const scored = stats.filter((s) => s.latestCraft !== null);
    const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
    return {
      ...c,
      students: stats.length,
      activeThisWeek: stats.filter((s) => s.lastActive && s.lastActive > weekAgo).length,
      chats: stats.reduce((n, s) => n + s.chats, 0),
      attempts: stats.reduce((n, s) => n + s.attempts, 0),
      avgFirstCraft: avg(scored.map((s) => s.firstCraft!)),
      avgLatestCraft: avg(scored.map((s) => s.latestCraft!)),
      lastActive: stats.reduce<string | null>((m, s) => (s.lastActive && (!m || s.lastActive > m) ? s.lastActive : m), null),
    };
  });

  const count = (sql: string, ...args: string[]) => (d.prepare(sql).get(...args) as { n: number }).n;
  return Response.json({
    totals: {
      teachers: count("SELECT COUNT(*) AS n FROM users WHERE role = 'teacher'"),
      students: count("SELECT COUNT(*) AS n FROM users WHERE role = 'student'"),
      chats: count("SELECT COUNT(*) AS n FROM chats"),
      activeThisWeek: count(
        "SELECT COUNT(DISTINCT c.user_id) AS n FROM chats c JOIN users u ON u.id = c.user_id WHERE u.role = 'student' AND c.updated_at > ?",
        weekAgo,
      ),
    },
    classes: rows,
  });
}
