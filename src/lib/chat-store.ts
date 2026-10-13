import { z } from "zod";
import { db } from "./db";
import type { LabChat } from "./lab-chat";
import { TASK_TYPES } from "./schemas";

// Server-side storage of Prompt Lab chats. A chat is stored whole as JSON; a few columns are
// copied out so lists and the teacher dashboard can sort and filter without parsing every chat.

const Turn = z.union([
  z.object({
    id: z.string(),
    role: z.literal("student"),
    kind: z.enum(["draft", "answers", "attempt", "message"]),
    text: z.string().max(10000),
    at: z.string(),
  }),
  // Tutor results were already validated by /api/lab when they were made; only the shape is checked here.
  z.object({ id: z.string(), role: z.literal("tutor"), result: z.record(z.string(), z.unknown()), at: z.string() }),
]);

export const ChatSchema = z.object({
  id: z.string().min(8).max(64),
  title: z.string().max(200),
  task: z.enum(TASK_TYPES),
  lang: z.enum(["id", "my", "km"]).optional(),
  useBrief: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  turns: z.array(Turn).max(400),
});

export type SaveResult = "saved" | "stale" | "forbidden";

/** Insert or update a chat for this user. Never overwrites another user's chat or a newer copy. */
export function saveChat(userId: string, chat: z.infer<typeof ChatSchema>): SaveResult {
  const d = db();
  const existing = d.prepare("SELECT user_id, updated_at FROM chats WHERE id = ?").get(chat.id) as
    | { user_id: string; updated_at: string }
    | undefined;
  if (existing && existing.user_id !== userId) return "forbidden";
  if (existing && existing.updated_at > chat.updatedAt) return "stale";
  d.prepare(
    `INSERT INTO chats (id, user_id, title, lang, task, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, lang = excluded.lang, task = excluded.task,
       updated_at = excluded.updated_at, data = excluded.data`,
  ).run(chat.id, userId, chat.title, chat.lang ?? "id", chat.task, chat.createdAt, chat.updatedAt, JSON.stringify(chat));
  return "saved";
}

export function chatsForUser(userId: string): LabChat[] {
  const rows = db().prepare("SELECT data FROM chats WHERE user_id = ? ORDER BY updated_at DESC").all(userId) as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as LabChat);
}
