import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db, type UserRow } from "./db";

// Username + password accounts with a server-side session cookie. No email needed:
// students join with a class code from their teacher; teachers sign up with a one-time code from an admin.

const COOKIE = "eaib_session";
const SESSION_DAYS = 60;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  const d = db();
  d.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
  d.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(sha256(token), userId, expires.toISOString());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // The app is served over plain http on the VPS for now; set COOKIE_SECURE=1 once it is behind https.
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
  store.delete(COOKIE);
}

const USER_COLUMNS = "u.id, u.role, u.username, u.display_name, u.class_id, u.is_admin, u.created_at";

export async function currentUser(): Promise<UserRow | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = db()
    .prepare(`SELECT ${USER_COLUMNS} FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`)
    .get(sha256(token), new Date().toISOString());
  return (row as UserRow | undefined) ?? null;
}

/** The logged-in user, or a 401/403 Response to return from a route handler. */
export async function requireUser(role?: UserRow["role"] | "admin"): Promise<{ user: UserRow } | { response: Response }> {
  const user = await currentUser();
  if (!user) return { response: Response.json({ error: "Please log in." }, { status: 401 }) };
  const allowed = !role || (role === "admin" ? !!user.is_admin : user.role === role);
  if (!allowed) return { response: Response.json({ error: "Not allowed." }, { status: 403 }) };
  return { user };
}

export function createUser(u: { role: UserRow["role"]; username: string; displayName: string; password: string; classId: string | null }) {
  const id = randomUUID();
  db()
    .prepare("INSERT INTO users (id, role, username, display_name, password_hash, class_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, u.role, u.username, u.displayName, hashPassword(u.password), u.classId, new Date().toISOString());
  return id;
}

/** Short code without look-alike characters (0/O, 1/I/L). Class join codes are 6 long; teacher invites 10. */
export function newClassCode(length = 6): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

export const publicUser = (u: UserRow) => ({
  id: u.id,
  role: u.role,
  username: u.username,
  displayName: u.display_name,
  classId: u.class_id,
  isAdmin: !!u.is_admin,
});
export type PublicUser = ReturnType<typeof publicUser>;
