import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

// One SQLite file on the server holds accounts, classes and saved Prompt Lab chats.
// Path can be moved with DATABASE_PATH; the default is data/app.db (gitignored).

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lang TEXT NOT NULL,
  task TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS chats_user ON chats(user_id, updated_at);
CREATE INDEX IF NOT EXISTS users_class ON users(class_id);
CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY COLLATE NOCASE,
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  used_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  used_at TEXT
);
`;

/** Changes to tables that already exist in older database files. */
function migrate(d: DatabaseSync) {
  const cols = d.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  // Admins are teachers who can also make teacher sign-up codes and see every class.
  if (!cols.some((c) => c.name === "is_admin")) d.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0");
}

const g = globalThis as unknown as { __eaibDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!g.__eaibDb) {
    mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const d = new DatabaseSync(DB_PATH);
    d.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    d.exec(SCHEMA);
    migrate(d);
    g.__eaibDb = d;
  }
  return g.__eaibDb;
}

export interface UserRow {
  id: string;
  role: "student" | "teacher";
  username: string;
  display_name: string;
  class_id: string | null;
  is_admin: number;
  created_at: string;
}

export interface ClassRow {
  id: string;
  name: string;
  code: string;
  teacher_id: string;
  created_at: string;
}
