"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LabChat } from "./lab-chat";
import { clearStored, getJSON, KEYS, postJSON, readStored, useStored } from "./store";

export type SyncStatus = "loading" | "saved" | "saving" | "error";

/**
 * The logged-in user's Prompt Lab chats. The browser keeps a cache so the page works instantly and
 * survives a dropped connection; every changed chat is saved to the server shortly after it changes.
 */
export function useChatSync(userId: string) {
  const key = KEYS.labChatsFor(userId);
  const [chats, setChats] = useStored<LabChat[]>(key, []);
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [loadTry, setLoadTry] = useState(0);
  const [pushTry, setPushTry] = useState(0);
  /** updatedAt of each chat as the server has it; null until the first load finishes. */
  const synced = useRef<Map<string, string> | null>(null);

  // First load: merge the server copy with this browser's cache (and chats saved before accounts existed).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { chats: server } = await getJSON<{ chats: LabChat[] }>("/api/chats");
        if (cancelled) return;
        const onServer = new Map(server.map((c) => [c.id, c.updatedAt]));
        const local = [...readStored<LabChat[]>(key, []), ...readStored<LabChat[]>(KEYS.labChats, [])];
        const upload = local.filter((c) => !onServer.has(c.id) || onServer.get(c.id)! < c.updatedAt);
        const final = upload.length ? (await postJSON<{ chats: LabChat[] }>("/api/chats", { chats: upload })).chats : server;
        if (cancelled) return;
        clearStored(KEYS.labChats);
        synced.current = new Map(final.map((c) => [c.id, c.updatedAt]));
        setChats(final);
        setStatus("saved");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setTimeout(() => setLoadTry((n) => n + 1), 15000);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // setChats is stable for a given key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, loadTry]);

  // Push changed chats to the server, a moment after typing/replies settle.
  useEffect(() => {
    const known = synced.current;
    if (!known) return;
    const changed = chats.filter((c) => known.get(c.id) !== c.updatedAt);
    if (!changed.length) return;
    setStatus("saving");
    const timer = setTimeout(async () => {
      try {
        await Promise.all(
          changed.map(async (c) => {
            await postJSON(`/api/chats/${encodeURIComponent(c.id)}`, c, "PUT");
            known.set(c.id, c.updatedAt);
          }),
        );
        setStatus("saved");
      } catch {
        setStatus("error");
        setTimeout(() => setPushTry((n) => n + 1), 15000);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [chats, pushTry, loadTry]);

  const deleteChat = useCallback(
    (id: string) => {
      setChats((all) => all.filter((c) => c.id !== id));
      synced.current?.delete(id);
      fetch(`/api/chats/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => setStatus("error"));
    },
    [setChats],
  );

  return { chats, setChats, deleteChat, status };
}
