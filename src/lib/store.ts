"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// Student work is cached in the browser (localStorage). Prompt Lab chats are also saved to the
// server for logged-in users (see useChatSync); the per-user cache key keeps shared computers apart.

export const KEYS = {
  lang: "pb.lang",
  fields: "pb.fields",
  chat: (stage: string) => `pb.chat.${stage}`,
  brief: "pb.brief",
  journal: "pb.journal",
  labDraft: "pb.labDraft",
  /** Chats saved before accounts existed. Moved to the first account that logs in on this browser. */
  labChats: "pb.labChats",
  labChatsFor: (userId: string) => `pb.labChats.${userId}`,
  teacherLang: "pb.teacherLang",
  labCurrent: "pb.labCurrent",
  studentName: "pb.studentName",
  studentGroup: "pb.studentGroup",
} as const;

// Raw JSON strings, kept in memory so the UI still works if storage is blocked.
const memory = new Map<string, string | null>();

function getRaw(key: string): string | null {
  if (!memory.has(key)) {
    try {
      memory.set(key, localStorage.getItem(key));
    } catch {
      memory.set(key, null);
    }
  }
  return memory.get(key)!;
}

function setRaw(key: string, raw: string) {
  memory.set(key, raw);
  try {
    localStorage.setItem(key, raw);
  } catch {
    // Storage full or blocked: work continues in memory for this session.
  }
  window.dispatchEvent(new CustomEvent("pb-store", { detail: key }));
}

/** Read a stored value once, outside React. */
export function readStored<T>(key: string, fallback: T): T {
  return parse(getRaw(key), fallback);
}

export function clearStored(key: string) {
  memory.set(key, null);
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("pb-store", { detail: key }));
}

function parse<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** useState that persists to localStorage and syncs across components. */
export function useStored<T>(key: string, fallback: T) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const handler = (e: Event) => {
        if (e instanceof StorageEvent) {
          if (e.key !== key) return;
          memory.delete(key); // changed in another tab
        } else if ((e as CustomEvent).detail !== key) return;
        onChange();
      };
      window.addEventListener("pb-store", handler);
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener("pb-store", handler);
        window.removeEventListener("storage", handler);
      };
    },
    [key],
  );

  const raw = useSyncExternalStore(subscribe, () => getRaw(key), () => null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fallback is a constant per call site
  const value = useMemo(() => parse(raw, fallback), [raw]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = parse(getRaw(key), fallback);
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      setRaw(key, JSON.stringify(resolved));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, update] as const;
}

export interface JournalEntry {
  id: string;
  createdAt: string;
  draft: string;
  level: string;
  prompt_en: string;
  prompt_l1: string;
  reflection: string;
}

export async function postJSON<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: "Network error." }));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({ error: "Network error." }));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}
