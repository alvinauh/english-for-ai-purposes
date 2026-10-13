"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth, type SessionUser } from "@/components/auth";
import { briefToText } from "@/components/brief-view";
import { Bi, LangSelect, useLang } from "@/components/lang";
import { Button, Card, CopyButton, ErrorNote, SocraticTag, Spinner } from "@/components/ui";
import { LEARNER_LANGS, type LearnerLang } from "@/lib/design-thinking";
import {
  chatHistory,
  chatLang,
  chatsToCSV,
  chatsToJSON,
  chatToMarkdown,
  downloadText,
  exchanges,
  fileSlug,
  KIND_LABELS,
  latestTutor,
  newChat,
  STAGES,
  TASK_NAMES,
  type LabChat,
  type LabTurn,
  type StudentInfo,
  type StudentKind,
  parseChatsJSON,
  uid,
} from "@/lib/lab-chat";
import { CRAFT_ELEMENTS, type ProjectBrief, type PromptLabResult, type TaskType } from "@/lib/schemas";
import { KEYS, postJSON, useStored, type JournalEntry } from "@/lib/store";
import { useChatSync, type SyncStatus } from "@/lib/use-chat-sync";

const TASKS: { key: TaskType; id: string; my: string }[] = [
  { key: "write", id: "Menulis konten", my: "စာ ရေးသားခြင်း" },
  { key: "build", id: "Membuat aplikasi / chatbot", my: "app / chatbot တည်ဆောက်ခြင်း" },
  { key: "image", id: "Membuat gambar", my: "ပုံ ဖန်တီးခြင်း" },
  { key: "research", id: "Riset & analisis", my: "သုတေသနနှင့် ခွဲခြမ်းစိတ်ဖြာခြင်း" },
  { key: "learn", id: "Mempelajari topik", my: "ခေါင်းစဉ်တစ်ခု လေ့လာခြင်း" },
];

const LEVELS = {
  starter: { en: "Starter", id: "Dasar", my: "အခြေခံ", hint: "Clear and complete" },
  structured: { en: "Structured", id: "Terstruktur", my: "စနစ်တကျ", hint: "All 5 CRAFT parts" },
  advanced: { en: "Advanced", id: "Lanjutan", my: "အဆင့်မြင့်", hint: "Builder techniques" },
} as const;

/** The gloss for the learner's language, if we have one. */
const gloss = (lang: LearnerLang, g: { id: string; my: string }) => (lang === "id" ? g.id : lang === "my" ? g.my : null);

// Languages a chat can be held in. Khmer stays in the header picker as a beta.
const CHAT_LANGS: LearnerLang[] = ["id", "my"];

const START_PLACEHOLDERS: Partial<Record<LearnerLang, string>> = {
  id: "contoh: buatin chatbot yang bisa jawab pertanyaan pembeli tentang menu warung saya",
  my: "ဥပမာ - ကျွန်တော့်ဆိုင်ရဲ့ မီနူးအကြောင်း ဝယ်သူတွေ မေးတဲ့မေးခွန်းတွေကို ဖြေပေးနိုင်တဲ့ chatbot တစ်ခု လုပ်ချင်တယ်",
};

const CRAFT_LABELS = { context: "Context", role: "Role", action: "Action", format: "Format", tone: "Tone" };

const PLACEHOLDERS: Record<string, string> = {
  write_own_version: "Write your own improved prompt in English. Use the sentence frames above…",
  revise_again: "Revise your prompt using the hints, then send it again…",
  test_in_ai: "Tell me what happened when you tested it, or ask a question…",
  default: "Ask a question, or write a new version of your prompt…",
};

export default function LabPage() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Loading…" />;
  if (!user) {
    return (
      <Card className="mx-auto max-w-lg space-y-3 text-center">
        <h1 className="text-2xl font-extrabold">Prompt Lab</h1>
        <p>
          <Bi
            en="Log in to use the Prompt Lab. Your chats are saved to your account so your teacher can follow your progress."
            id="Masuk untuk memakai Prompt Lab. Chat-mu tersimpan di akunmu sehingga gurumu bisa mengikuti perkembanganmu."
            my="Prompt Lab ကို သုံးရန် ဝင်ရောက်ပါ။ သင့် chat များကို အကောင့်ထဲ သိမ်းထားလို့ ဆရာက သင့်တိုးတက်မှုကို ကြည့်နိုင်ပါတယ်။"
          />
        </p>
        <Link href="/login?next=/lab" className="inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong">
          Log in / Sign up
        </Link>
      </Card>
    );
  }
  return <LabChatPage key={user.id} user={user} />;
}

const SYNC_LABELS: Record<SyncStatus, { en: string; id: string; my: string; tone: string }> = {
  loading: { en: "Loading your chats…", id: "Memuat chat…", my: "chat များ ဖွင့်နေသည်…", tone: "text-muted" },
  saving: { en: "Saving…", id: "Menyimpan…", my: "သိမ်းနေသည်…", tone: "text-muted" },
  saved: { en: "Saved to your account ✓", id: "Tersimpan di akunmu ✓", my: "အကောင့်ထဲ သိမ်းပြီး ✓", tone: "text-green-700 dark:text-green-400" },
  error: {
    en: "Not saved yet: no connection. Retrying…",
    id: "Belum tersimpan: tidak ada koneksi. Mencoba lagi…",
    my: "မသိမ်းရသေးပါ: အင်တာနက် မရှိပါ။ ထပ်ကြိုးစားနေသည်…",
    tone: "text-red-700 dark:text-red-400",
  },
};

function LabChatPage({ user }: { user: SessionUser }) {
  const { lang, setLang } = useLang();
  const { chats, setChats, deleteChat: removeChat, status } = useChatSync(user.id);
  const [currentId, setCurrentId] = useStored<string | null>(KEYS.labCurrent, null);
  const [draft, setDraft] = useStored<string>(KEYS.labDraft, "");
  const studentName = user.displayName;
  const studentGroup = user.className ?? "";
  const student: StudentInfo = { name: studentName, group: studentGroup };
  const importRef = useRef<HTMLInputElement>(null);
  const [brief] = useStored<ProjectBrief | null>(KEYS.brief, null);
  const [, setJournal] = useStored<JournalEntry[]>(KEYS.journal, []);
  const [task, setTask] = useState<TaskType>("write");
  const [useBrief, setUseBrief] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);

  const chat = chats.find((c) => c.id === currentId);
  const latest = latestTutor(chat);
  const started = !!chat?.turns.length;
  const nextAction = latest?.next_step.action;

  // Open every collapsed section when printing so the printout is complete.
  useEffect(() => {
    const opened: HTMLDetailsElement[] = [];
    const before = () =>
      document.querySelectorAll<HTMLDetailsElement>("details:not([open])").forEach((d) => {
        d.open = true;
        opened.push(d);
      });
    const after = () => opened.splice(0).forEach((d) => (d.open = false));
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  useEffect(() => {
    if (started) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat?.turns.length, loading, started]);

  function updateChat(id: string, fn: (c: LabChat) => LabChat) {
    setChats((all) => all.map((c) => (c.id === id ? fn(c) : c)));
  }

  async function send(text: string, kind: StudentKind) {
    if (!text.trim() || loading) return;
    let target = chat;
    if (!target) {
      target = newChat(task, useBrief, lang);
      target.title = text.trim().slice(0, 60);
      const created = target;
      setChats((all) => [created, ...all]);
      setCurrentId(created.id);
    }
    const studentTurn: LabTurn = { id: uid(), role: "student", kind, text: text.trim(), at: new Date().toISOString() };
    const history = chatHistory(target);
    const id = target.id;
    const { task: chatTask, useBrief: chatUseBrief } = target;
    updateChat(id, (c) => ({ ...c, turns: [...c.turns, studentTurn], updatedAt: studentTurn.at }));
    if (kind !== "answers") setDraft("");
    setAnswers({});
    setLoading(true);
    setError(null);
    try {
      const result = await postJSON<PromptLabResult>("/api/lab", {
        lang: chatLang(target),
        task: chatTask,
        briefText: chatUseBrief && brief ? briefToText(brief) : undefined,
        history,
        message: studentTurn.text,
        kind,
      });
      const at = new Date().toISOString();
      updateChat(id, (c) => ({ ...c, turns: [...c.turns, { id: uid(), role: "tutor", result, at }], updatedAt: at }));
    } catch (e) {
      setError((e as Error).message);
      // Put the message back so the student can retry.
      updateChat(id, (c) => ({ ...c, turns: c.turns.filter((t) => t.id !== studentTurn.id) }));
      if (kind !== "answers") setDraft(studentTurn.text);
    } finally {
      setLoading(false);
    }
  }

  function sendComposer() {
    const kind: StudentKind = !started
      ? "draft"
      : nextAction === "write_own_version" || nextAction === "revise_again"
        ? "attempt"
        : "message";
    send(draft, kind);
  }

  function sendAnswers(questions: PromptLabResult["clarifying_questions"]) {
    const text = questions
      .map((q, i) => (answers[i]?.trim() ? `Q: ${q.question_en}\nA: ${answers[i].trim()}` : null))
      .filter(Boolean)
      .join("\n\n");
    send(text, "answers");
  }

  function savePrompt(option: PromptLabResult["options"][number], turnId: string) {
    const firstIdea = chat?.turns.find((t) => t.role === "student");
    setJournal((j) => [
      {
        id: uid(),
        createdAt: new Date().toISOString(),
        draft: firstIdea?.role === "student" ? firstIdea.text : "",
        level: option.level,
        prompt_en: option.prompt_en,
        prompt_l1: option.prompt_l1,
        reflection: "",
      },
      ...j,
    ]);
    setSavedPrompts((s) => new Set(s).add(turnId + option.level));
  }

  function startNew() {
    setCurrentId(null);
    setAnswers({});
    setError(null);
  }

  function openChat(c: LabChat) {
    setCurrentId(c.id);
    setLang(chatLang(c)); // show the glosses in the language the chat was held in
    setAnswers({});
    setError(null);
  }

  function deleteChat(id: string) {
    if (!confirm("Delete this chat? This cannot be undone.")) return;
    removeChat(id);
    if (id === currentId) setCurrentId(null);
  }

  const exportName = (what: string, ext: string) =>
    `prompt-lab-${[fileSlug(studentName), what].filter(Boolean).join("-")}-${new Date().toISOString().slice(0, 10)}.${ext}`;

  function download(format: "md" | "json") {
    if (!chat) return;
    const name = exportName(fileSlug(chat.title) || "chat", format);
    if (format === "md") downloadText(name, chatToMarkdown(chat, student));
    else downloadText(name, chatsToJSON([chat], student), "application/json");
  }

  function exportAll(format: "csv" | "json") {
    if (format === "csv") downloadText(exportName("all-chats", "csv"), chatsToCSV(chats, student), "text/csv");
    else downloadText(exportName("all-chats", "json"), chatsToJSON(chats, student), "application/json");
  }

  async function importFile(file: File) {
    try {
      const incoming = parseChatsJSON(await file.text());
      // Merge by id; keep whichever copy was updated last.
      setChats((all) => {
        const byId = new Map(all.map((c) => [c.id, c]));
        for (const c of incoming) {
          const mine = byId.get(c.id);
          if (!mine || mine.updatedAt < c.updatedAt) byId.set(c.id, c);
        }
        return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
      setError(null);
      alert(`Imported ${incoming.length} chat${incoming.length === 1 ? "" : "s"}.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const stageIndex = latest ? STAGES.findIndex((s) => s.key === latest.stage) : 0;
  const lastTurnId = chat?.turns.at(-1)?.id;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      {/* Saved chats */}
      <aside className="space-y-3 print:hidden">
        <Button className="w-full" onClick={startNew}>
          + New chat
        </Button>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            <Bi en="Saved chats" id="Chat tersimpan" my="သိမ်းထားသော chat များ" />
          </p>
          {chats.length === 0 && <p className="text-sm text-muted">Your chats are saved here automatically.</p>}
          <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
            {chats.map((c) => (
              <li key={c.id} className="group flex items-center gap-1">
                <button
                  onClick={() => openChat(c)}
                  className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-sm ${
                    c.id === currentId ? "bg-accent-soft font-semibold" : "hover:bg-subtle"
                  }`}
                >
                  <span className="block truncate">{c.title}</span>
                  <span className="block text-xs text-muted">
                    {new Date(c.updatedAt).toLocaleDateString()} · {LEARNER_LANGS[chatLang(c)].native}
                  </span>
                </button>
                <button
                  onClick={() => deleteChat(c.id)}
                  aria-label="Delete chat"
                  className="rounded px-1.5 text-muted opacity-60 hover:bg-subtle hover:text-ink group-hover:opacity-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-0.5 border-t border-line pt-3 text-sm">
          <p className="font-semibold">{user.displayName}</p>
          <p className="text-xs text-muted">
            @{user.username}
            {user.className && ` · ${user.className}`}
          </p>
          <p className={`text-xs ${SYNC_LABELS[status].tone}`}>
            <Bi en={SYNC_LABELS[status].en} id={SYNC_LABELS[status].id} my={SYNC_LABELS[status].my} />
          </p>
        </div>
        <div className="space-y-1.5 border-t border-line pt-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Download a copy</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="!px-2.5 !py-1 text-xs" disabled={!chats.length} onClick={() => exportAll("csv")}>
              All chats (.csv)
            </Button>
            <Button variant="ghost" className="!px-2.5 !py-1 text-xs" disabled={!chats.length} onClick={() => exportAll("json")}>
              All chats (.json)
            </Button>
            <Button variant="ghost" className="!px-2.5 !py-1 text-xs" onClick={() => importRef.current?.click()}>
              Import .json
            </Button>
          </div>
          <p className="text-xs text-muted">
            Your teacher already sees your saved chats. CSV has one row per message with its CRAFT score, for a spreadsheet. JSON keeps
            everything and can be imported again.
          </p>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="mr-auto">
            <h1 className="text-3xl font-extrabold">Prompt Lab</h1>
            {gloss(lang, SUBTITLE) && <p className="text-muted italic print:hidden">{gloss(lang, SUBTITLE)}</p>}
          </div>
          {started && (
            <div className="flex gap-2 print:hidden">
              <Button variant="ghost" onClick={() => download("md")}>
                Download (.md)
              </Button>
              <Button variant="ghost" onClick={() => download("json")}>
                .json
              </Button>
              <Button variant="ghost" onClick={() => window.print()}>
                Print / PDF
              </Button>
            </div>
          )}
        </div>

        {/* Print-only header */}
        {chat && (
          <div className="hidden border-b border-line pb-3 text-sm print:block">
            <p className="text-lg font-bold">{chat.title}</p>
            {studentName.trim() && (
              <p>
                Student: {studentName}
                {studentGroup.trim() && ` · ${studentGroup}`}
              </p>
            )}
            <p>
              Date: {new Date(chat.createdAt).toLocaleString()} · Language: {LEARNER_LANGS[chatLang(chat)].name} · Task:{" "}
              {TASK_NAMES[chat.task]}
            </p>
          </div>
        )}

        {/* Scaffold progress */}
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 print:hidden">
          {STAGES.map((s, i) => {
            const state = !started ? (i === 0 ? "current" : "todo") : i < stageIndex ? "done" : i === stageIndex ? "current" : "todo";
            return (
              <li
                key={s.key}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  state === "current"
                    ? "border-accent bg-accent-soft font-semibold"
                    : state === "done"
                      ? "border-green-600/40 bg-green-50 dark:bg-green-950/40"
                      : "border-line bg-surface text-muted"
                }`}
              >
                <span className="mr-1">{state === "done" ? "✓" : `${i + 1}.`}</span>
                <Bi en={s.en} id={s.id} my={s.my} />
              </li>
            );
          })}
        </ol>

        {/* Setup for a new chat */}
        {!started && (
          <Card className="space-y-4">
            <p>
              <Bi
                en="Start by telling the tutor your idea, in any language. The tutor will guide you step by step: first it shows examples, then you answer questions, then you write your own prompt."
                id="Mulai dengan menceritakan idemu, dalam bahasa apa saja. Tutor akan membimbingmu: pertama memberi contoh, lalu kamu menjawab pertanyaan, lalu kamu menulis prompt sendiri."
                my="သင့်အိုင်ဒီယာကို မည်သည့်ဘာသာစကားဖြင့်မဆို ပြောပြပါ။ ဆရာက အဆင့်ဆင့် လမ်းပြပေးပါမယ် - ပထမ နမူနာတွေ ပြပေးမယ်၊ ပြီးရင် သင်က မေးခွန်းတွေကို ဖြေမယ်၊ နောက်ဆုံး သင့် prompt ကို ကိုယ်တိုင် ရေးမယ်။"
              />
            </p>
            <div className="space-y-1">
              <span className="text-sm font-semibold">
                <Bi en="My language" id="Bahasaku" my="ကျွန်ုပ်၏ ဘာသာစကား" />
              </span>
              <div className="flex flex-wrap gap-2">
                {CHAT_LANGS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      lang === l ? "border-accent bg-accent-soft font-semibold" : "border-line bg-surface hover:bg-subtle"
                    }`}
                  >
                    {LEARNER_LANGS[l].native}
                  </button>
                ))}
                {!CHAT_LANGS.includes(lang) && <LangSelect />}
              </div>
              <p className="text-xs text-muted">The tutor translates and explains in this language. You can still mix in English.</p>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-semibold">
                <Bi en="What is it for?" id="Untuk apa?" my="ဘာအတွက်လဲ?" />
              </span>
              <div className="flex flex-wrap gap-2">
                {TASKS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTask(t.key)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      task === t.key ? "border-accent bg-accent-soft font-semibold" : "border-line bg-surface hover:bg-subtle"
                    }`}
                  >
                    {TASK_NAMES[t.key]}
                    {gloss(lang, t) && <span className="ml-1 text-muted">· {gloss(lang, t)}</span>}
                  </button>
                ))}
              </div>
            </div>
            {brief ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={useBrief} onChange={(e) => setUseBrief(e.target.checked)} />
                Use my project brief as context: <strong>{brief.title.en}</strong>
              </label>
            ) : (
              <p className="text-sm text-muted">
                Tip: create a <Link href="/studio" className="text-accent underline">project brief</Link> first so prompts fit your project.
              </p>
            )}
          </Card>
        )}

        {chat && <ChainSummary chat={chat} />}

        {/* The chat chain */}
        {chat && (
          <div className="space-y-4">
            {chat.turns.map((t) =>
              t.role === "student" ? (
                <StudentBubble key={t.id} turn={t} />
              ) : (
                <TutorBubble
                  key={t.id}
                  turnId={t.id}
                  r={t.result}
                  isLatest={t.id === lastTurnId}
                  answers={answers}
                  setAnswers={setAnswers}
                  onSendAnswers={sendAnswers}
                  onSave={savePrompt}
                  saved={savedPrompts}
                  loading={loading}
                />
              ),
            )}
            {loading && (
              <div className="rounded-xl border border-line bg-surface p-4">
                <Spinner label="The tutor is thinking…" />
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        <ErrorNote message={error} />

        {/* Composer */}
        <Card className="space-y-3 print:hidden">
          <label className="block space-y-1">
            <span className="font-semibold">
              {!started ? (
                <Bi en="Your rough prompt idea" id="Ide prompt-mu (boleh bahasa Indonesia)" my="သင့် prompt အိုင်ဒီယာ (မြန်မာလို ရေးလို့ရပါတယ်)" />
              ) : nextAction === "write_own_version" || nextAction === "revise_again" ? (
                <Bi en="Your turn: write your own prompt" id="Giliranmu: tulis prompt-mu sendiri" my="သင့်အလှည့်: သင့် prompt ကို ကိုယ်တိုင် ရေးပါ" />
              ) : (
                <Bi en="Reply to the tutor" id="Balas tutor" my="ဆရာ့ကို ပြန်ဖြေပါ" />
              )}
            </span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendComposer();
              }}
              rows={4}
              placeholder={
                !started
                  ? (START_PLACEHOLDERS[lang] ?? START_PLACEHOLDERS.id)
                  : (PLACEHOLDERS[nextAction ?? "default"] ?? PLACEHOLDERS.default)
              }
              className="w-full rounded-lg border border-line bg-bg p-3 focus:border-accent focus:outline-none"
            />
          </label>
          {started && (
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                "What does this word mean: ",
                "Can you explain why the structured prompt is better?",
                "Please check my English: ",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setDraft(chip)}
                  className="rounded-full border border-line bg-surface px-2.5 py-1 hover:bg-subtle"
                >
                  {chip.trim()}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">Ctrl + Enter to send</span>
            <Button className="ml-auto" onClick={sendComposer} disabled={loading || !draft.trim()}>
              {loading ? <Spinner label="Sending…" /> : started ? "Send" : "Start the chat"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

const SUBTITLE = {
  id: "Ngobrol dengan tutor AI, langkah demi langkah, sampai kamu bisa menulis prompt bahasa Inggris sendiri.",
  my: "AI ဆရာနဲ့ အဆင့်ဆင့် စကားပြောပြီး အင်္ဂလိပ် prompt ကို ကိုယ်တိုင် ရေးတတ်အောင် လေ့ကျင့်ပါ။",
};

/** The prompt chain at a glance: each student message and how many CRAFT parts it had. */
function ChainSummary({ chat }: { chat: LabChat }) {
  const chain = exchanges(chat);
  if (chain.length < 2) return null;
  return (
    <Card className="space-y-2 break-inside-avoid">
      <p className="text-sm font-bold">
        <Bi en="Your prompt chain" id="Rantai prompt-mu" my="သင့် prompt အဆင့်ဆင့်" />
      </p>
      <ol className="space-y-1.5 text-sm">
        {chain.map((x) => (
          <li key={x.student.id} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2">
            <span className="text-muted">{x.n}.</span>
            <span className="min-w-0 truncate">
              <span className="mr-1 text-xs font-semibold uppercase text-accent">
                {KIND_LABELS[x.student.kind]}
                {x.attemptNo && ` ${x.attemptNo}`}
              </span>
              {x.student.text}
            </span>
            {x.craft ? (
              <span className="flex items-center gap-0.5" title={`CRAFT ${x.craft.score}/5`}>
                {CRAFT_ELEMENTS.map((e) => (
                  <span
                    key={e}
                    className={`grid h-5 w-5 place-items-center rounded text-[10px] font-bold ${
                      x.craft!.present.includes(e) ? "bg-green-600 text-white" : "bg-subtle text-muted"
                    }`}
                  >
                    {e[0].toUpperCase()}
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-xs text-muted">question</span>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function StudentBubble({ turn }: { turn: Extract<LabTurn, { role: "student" }> }) {
  return (
    <div className="flex justify-end break-inside-avoid">
      <div className="max-w-[85%] rounded-xl rounded-br-sm bg-accent-soft px-4 py-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">{KIND_LABELS[turn.kind]}</p>
        <p className="whitespace-pre-wrap">{turn.text}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  open,
  children,
}: {
  title: React.ReactNode;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="group rounded-lg border border-line">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold select-none">
        <span className="mr-1 inline-block transition group-open:rotate-90">›</span>
        {title}
      </summary>
      <div className="space-y-3 border-t border-line p-3">{children}</div>
    </details>
  );
}

function TutorBubble({
  turnId,
  r,
  isLatest,
  answers,
  setAnswers,
  onSendAnswers,
  onSave,
  saved,
  loading,
}: {
  turnId: string;
  r: PromptLabResult;
  isLatest: boolean;
  answers: Record<number, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  onSendAnswers: (q: PromptLabResult["clarifying_questions"]) => void;
  onSave: (o: PromptLabResult["options"][number], turnId: string) => void;
  saved: Set<string>;
  loading: boolean;
}) {
  const { lang } = useLang();
  const stage = STAGES.find((s) => s.key === r.stage);
  const hasAnswers = Object.values(answers).some((a) => a.trim());
  const canAnswer = isLatest && r.clarifying_questions.length > 0;

  return (
    <Card className="max-w-[95%] space-y-4 rounded-bl-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Tutor</span>
        {stage && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">
            Step {STAGES.indexOf(stage) + 1}: {stage.en}
          </span>
        )}
      </div>

      <div>
        <p>{r.reply_en}</p>
        <p className="mt-1 text-sm text-muted italic">{r.reply_l1}</p>
      </div>

      {(r.understanding_l1 || r.direct_translation_en) && (
        <div className="grid gap-3 text-sm md:grid-cols-2">
          {r.understanding_l1 && (
            <div className="rounded-lg bg-subtle p-3">
              <p className="text-xs font-semibold uppercase text-muted">
                <Bi en="What the AI understood" id="Yang dipahami AI" my="AI နားလည်ထားတာ" />
              </p>
              <p className="mt-1">{r.understanding_l1}</p>
            </div>
          )}
          {r.direct_translation_en && (
            <div className="rounded-lg bg-subtle p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-muted">
                  <Bi en="Direct translation" id="Terjemahan langsung" my="တိုက်ရိုက် ဘာသာပြန်" />
                </p>
                <span className="print:hidden">
                  <CopyButton text={r.direct_translation_en} />
                </span>
              </div>
              <p className="mt-1 font-medium">{r.direct_translation_en}</p>
            </div>
          )}
        </div>
      )}

      {r.attempt_feedback && (
        <div className="space-y-2 rounded-lg border border-green-600/40 bg-green-50 p-3 text-sm dark:bg-green-950/40">
          <p>
            <strong>👍 What works:</strong> {r.attempt_feedback.strengths_en}
          </p>
          <p className="text-muted italic">{r.attempt_feedback.strengths_l1}</p>
          <p>
            <strong>💡 Try this:</strong> {r.attempt_feedback.improve_en}
          </p>
          <p className="text-muted italic">{r.attempt_feedback.improve_l1}</p>
          {r.attempt_feedback.english_upgrade && (
            <p className="rounded-md bg-surface p-2">
              <strong>English upgrade:</strong> <s className="text-muted">{r.attempt_feedback.english_upgrade.student_text}</s> →{" "}
              <span className="font-medium">{r.attempt_feedback.english_upgrade.improved_en}</span>
              <span className="block text-muted italic">{r.attempt_feedback.english_upgrade.explanation_l1}</span>
            </p>
          )}
        </div>
      )}

      {r.craft_check.length > 0 && (
        <Section
          open={isLatest}
          title={
            <>
              CRAFT check:{" "}
              {r.craft_check.map((c) => (
                <span key={c.element} className={`ml-1 font-normal ${c.present ? "text-green-700 dark:text-green-400" : "text-muted"}`}>
                  {c.present ? "✓" : "○"} {CRAFT_LABELS[c.element]}
                </span>
              ))}
            </>
          }
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {r.craft_check.map((c) => (
              <div
                key={c.element}
                className={`rounded-lg border p-2.5 text-sm ${c.present ? "border-green-600/40 bg-green-50 dark:bg-green-950/40" : "border-line bg-subtle"}`}
              >
                <p className="font-bold">
                  {c.present ? "✓" : "○"} {CRAFT_LABELS[c.element]}
                </p>
                <p className="mt-1">{c.tip_en}</p>
                <p className="mt-1 text-muted italic">{c.tip_l1}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {r.options.length > 0 && (
        <Section open={isLatest} title={<Bi en="Model prompts (examples)" id="Contoh prompt" my="နမူနာ prompt များ" />}>
          <p className="text-sm text-muted">Words in [square brackets] are guesses: change them to match your project.</p>
          {r.options.map((o) => {
            const meta = LEVELS[o.level];
            const key = turnId + o.level;
            return (
              <div key={o.level} className="space-y-2 rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-center gap-2 break-after-avoid">
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold uppercase text-accent">
                    {meta.en}
                    {gloss(lang, meta) && ` · ${gloss(lang, meta)}`}
                  </span>
                  <h3 className="font-bold">{o.title_en}</h3>
                  <span className="text-xs text-muted">{meta.hint}</span>
                  <div className="ml-auto flex gap-2 print:hidden">
                    <CopyButton text={o.prompt_en} />
                    <Button variant="ghost" className="!px-2.5 !py-1 text-xs" disabled={saved.has(key)} onClick={() => onSave(o, turnId)}>
                      {saved.has(key) ? "Saved ✓" : "Save to portfolio"}
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <pre className="rounded-lg bg-subtle p-3 font-sans text-sm leading-relaxed whitespace-pre-wrap">{o.prompt_en}</pre>
                  <pre className="rounded-lg border border-line p-3 font-sans text-sm leading-relaxed whitespace-pre-wrap text-muted">
                    {o.prompt_l1}
                  </pre>
                </div>
                <p className="text-sm">
                  <strong>Why it works:</strong> {o.why_it_works_en}
                  <span className="block text-muted italic">{o.why_it_works_l1}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {o.techniques.map((t) => (
                    <span key={t} className="rounded-full border border-line px-2 py-0.5 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {r.sentence_frames.length > 0 && (
        <div className="space-y-2 rounded-lg border border-dashed border-accent p-3">
          <p className="text-sm font-bold">
            <Bi en="Sentence frames: fill in the blanks" id="Kerangka kalimat: isi bagian yang kosong" my="ဝါကျပုံစံများ: ကွက်လပ်တွေကို ဖြည့်ပါ" />
          </p>
          <ul className="space-y-1.5 text-sm">
            {r.sentence_frames.map((f, i) => (
              <li key={i}>
                <span className="font-medium">{f.frame_en}</span>
                <span className="block text-muted italic">{f.hint_l1}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.clarifying_questions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold">
            <Bi en="Think deeper" id="Berpikir lebih dalam" my="ပိုနက်နက် စဉ်းစားပါ" />
          </p>
          {r.clarifying_questions.map((q, i) => (
            <div key={i} className="space-y-1.5 rounded-lg bg-socratic/40 p-3 break-inside-avoid">
              <SocraticTag type={q.type} />
              <p className="font-semibold">{q.question_en}</p>
              <p className="text-sm text-muted italic">{q.question_l1}</p>
              {canAnswer && (
                <input
                  value={answers[i] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                  placeholder="Your answer (English or your language)…"
                  className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none print:hidden"
                />
              )}
            </div>
          ))}
          {canAnswer && (
            <Button className="print:hidden" onClick={() => onSendAnswers(r.clarifying_questions)} disabled={loading || !hasAnswers}>
              Send my answers
            </Button>
          )}
        </div>
      )}

      {(r.vocabulary.length > 0 || r.grammar_tip) && (
        <Section title={<Bi en="Vocabulary & grammar" id="Kosakata & tata bahasa" my="ဝေါဟာရနှင့် သဒ္ဒါ" />}>
          {r.vocabulary.length > 0 && (
            <table className="w-full text-sm">
              <tbody>
                {r.vocabulary.map((v) => (
                  <tr key={v.term_en} className="border-t border-line align-top first:border-t-0">
                    <td className="py-1.5 pr-3 font-semibold">{v.term_en}</td>
                    <td className="py-1.5 pr-3 text-muted">{v.meaning_l1}</td>
                    <td className="py-1.5 italic">{v.example_en}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {r.grammar_tip && (
            <div className="text-sm">
              <p className="font-semibold">{r.grammar_tip.point_en}</p>
              <p className="mt-1 text-muted">{r.grammar_tip.explanation_l1}</p>
              <p className="mt-1 rounded-md bg-subtle p-2 italic">{r.grammar_tip.example_en}</p>
            </div>
          )}
        </Section>
      )}

      <div className="rounded-lg bg-accent-soft p-3 text-sm">
        <p>
          <strong>➡ Your next step:</strong> {r.next_step.en}
        </p>
        <p className="text-muted italic">{r.next_step.l1}</p>
      </div>
    </Card>
  );
}
