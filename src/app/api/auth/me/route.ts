import { currentUser, publicUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ user: null });
  const cls = user.class_id
    ? (db().prepare("SELECT name FROM classes WHERE id = ?").get(user.class_id) as { name: string } | undefined)
    : undefined;
  return Response.json({ user: { ...publicUser(user), className: cls?.name ?? null } });
}
