// Create an admin account, or make an existing account an admin.
//   ADMIN_USERNAME=... ADMIN_PASSWORD=... ADMIN_NAME="..." node scripts/create-admin.mjs
// Run it after the app has started and been opened once (so the database tables exist).
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const { ADMIN_USERNAME: username, ADMIN_PASSWORD: password, ADMIN_NAME: name } = process.env;
if (!username || !password || password.length < 6) {
  console.error("Set ADMIN_USERNAME and ADMIN_PASSWORD (at least 6 characters).");
  process.exit(1);
}

const db = new DatabaseSync(process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db"));
db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
// Same migration as src/lib/db.ts, in case the app has not run it yet.
if (!db.prepare("PRAGMA table_info(users)").all().some((c) => c.name === "is_admin")) {
  db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0");
}
const salt = randomBytes(16);
const hash = `scrypt:${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;

const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
if (existing) {
  db.prepare("UPDATE users SET role = 'teacher', is_admin = 1, password_hash = ?, class_id = NULL WHERE id = ?").run(hash, existing.id);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(existing.id);
  console.log(`Updated ${username}: now an admin, password reset.`);
} else {
  db.prepare(
    "INSERT INTO users (id, role, username, display_name, password_hash, class_id, is_admin, created_at) VALUES (?, 'teacher', ?, ?, ?, NULL, 1, ?)",
  ).run(randomUUID(), username, name || username, hash, new Date().toISOString());
  console.log(`Created admin ${username}.`);
}
