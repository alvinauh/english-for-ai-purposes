"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bi, useLang } from "@/components/lang";
import { BriefView } from "@/components/brief-view";
import { Button, Card, ErrorNote, SocraticTag, Spinner } from "@/components/ui";
import { STAGES, type ProjectFields, type StageKey } from "@/lib/design-thinking";
import type { CoachReply, ProjectBrief } from "@/lib/schemas";
import { KEYS, postJSON, useStored } from "@/lib/store";

type ChatTurn = { role: "student"; text: string } | { role: "coach"; text: string; reply: CoachReply };

const STARTERS: Record<StageKey, string> = {
  empathize: "Saya ingin membantu… / I want to help…",
  define: "Masalah utama mereka adalah… / Their main problem is…",
  ideate: "Ide saya adalah… / My ideas are…",
  prototype: "AI akan membantu dengan… / AI will help by…",
  test: "Saya akan menguji dengan… / I will test it with…",
};

export default function StudioPage() {
  const { lang } = useLang();
  const [stageKey, setStageKey] = useState<StageKey>("empathize");
  const [fields, setFields] = useStored<ProjectFields>(KEYS.fields, {});
  const [brief, setBrief] = useStored<ProjectBrief | null>(KEYS.brief, null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  const stage = STAGES.find((s) => s.key === stageKey)!;
  const filledCount = (key: StageKey) =>
    STAGES.find((s) => s.key === key)!.fields.filter((f) => fields[f.key]?.trim()).length;

  async function makeBrief() {
    setBriefLoading(true);
    setBriefError(null);
    try {
      setBrief(await postJSON<ProjectBrief>("/api/brief", { lang, fields }));
    } catch (e) {
      setBriefError((e as Error).message);
    } finally {
      setBriefLoading(false);
    }
  }

  const totalFilled = STAGES.reduce((n, s) => n + filledCount(s.key), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Project Studio</h1>
        <p className="text-muted italic">Rancang proyekmu dengan design thinking — sebelum menulis prompt.</p>
      </div>

      {/* Stage tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STAGES.map((s, i) => {
          const done = filledCount(s.key);
          const active = s.key === stageKey;
          return (
            <button
              key={s.key}
              onClick={() => setStageKey(s.key)}
              className={`min-w-36 shrink-0 rounded-xl border px-4 py-2.5 text-left transition ${
                active ? "border-accent bg-accent-soft" : "border-line bg-surface hover:bg-subtle"
              }`}
            >
              <span className="block text-xs text-muted">
                {i + 1} · Week {s.week} · {done}/{s.fields.length}
              </span>
              <span className="font-bold">{s.en}</span>
              {lang === "id" && <span className="block text-xs text-muted italic">{s.id}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">
              <Bi en={`${stage.en} canvas`} id={`Kanvas ${stage.id}`} />
            </h2>
            <p className="mt-1 text-sm">
              <Bi en={stage.goal_en} id={stage.goal_id} />
            </p>
          </div>
          {stage.fields.map((f) => (
            <label key={f.key} className="block space-y-1">
              <span className="text-sm font-semibold">
                <Bi en={f.en} id={f.id} />
              </span>
              <textarea
                value={fields[f.key] ?? ""}
                onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                rows={f.key === "ideas" || f.key === "features" || f.key === "buildSteps" ? 5 : 3}
                className="w-full rounded-lg border border-line bg-bg p-3 text-sm focus:border-accent focus:outline-none"
              />
            </label>
          ))}
          <p className="text-xs text-muted">
            Saved automatically in this browser. Write in English or Indonesian — the coach helps you improve your English.
          </p>
        </Card>

        <Coach
          key={stageKey}
          stageKey={stageKey}
          fields={fields}
          onApply={(key, value) => setFields((prev) => ({ ...prev, [key]: value }))}
        />
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h2 className="text-xl font-bold">
              <Bi en="Project brief" id="Ringkasan proyek" />
            </h2>
            <p className="text-sm text-muted">
              Turn your canvas into a one-page brief. You can regenerate it any time.
            </p>
          </div>
          <Button onClick={makeBrief} disabled={briefLoading || totalFilled < 3}>
            {briefLoading ? <Spinner label="Writing brief…" /> : brief ? "Update brief" : "Generate brief"}
          </Button>
          {brief && (
            <Link href="/lab" className="text-sm font-semibold text-accent underline">
              Take it to the Prompt Lab →
            </Link>
          )}
        </div>
        {totalFilled < 3 && <p className="text-sm text-muted">Fill in at least 3 canvas fields first.</p>}
        <ErrorNote message={briefError} />
        {brief && <BriefView brief={brief} />}
      </Card>
    </div>
  );
}

function Coach({
  stageKey,
  fields,
  onApply,
}: {
  stageKey: StageKey;
  fields: ProjectFields;
  onApply: (key: string, value: string) => void;
}) {
  const { lang } = useLang();
  const [chat, setChat] = useStored<ChatTurn[]>(KEYS.chat(stageKey), []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stage = STAGES.find((s) => s.key === stageKey)!;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chat.length, loading]);

  async function send() {
    const message = input.trim();
    if (!message || loading) return;
    setInput("");
    setError(null);
    const history = chat.map((t) => ({
      role: t.role,
      text:
        t.role === "coach"
          ? `${t.reply.feedback_en} ${t.reply.socratic_questions.map((q) => q.question_en).join(" ")}`
          : t.text,
    }));
    setChat((c) => [...c, { role: "student", text: message }]);
    setLoading(true);
    try {
      const reply = await postJSON<CoachReply>("/api/coach", { lang, stage: stageKey, fields, history, message });
      setChat((c) => [...c, { role: "coach", text: reply.feedback_en, reply }]);
    } catch (e) {
      setError((e as Error).message);
      setInput(message);
      setChat((c) => c.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex max-h-[80vh] min-h-[520px] flex-col">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">
            <Bi en="Socratic coach" id="Pelatih Sokratik" />
          </h2>
          <p className="text-sm text-muted">It asks questions — you find the answers.</p>
        </div>
        {chat.length > 0 && (
          <button className="text-xs text-muted underline" onClick={() => confirm("Clear this chat?") && setChat([])}>
            Clear
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
        {chat.length === 0 && (
          <div className="rounded-lg bg-subtle p-4 text-sm">
            <p className="font-semibold">Tell the coach about your {stage.en.toLowerCase()} ideas.</p>
            <p className="mt-1 text-muted">Try starting with: “{STARTERS[stageKey]}”</p>
          </div>
        )}
        {chat.map((turn, i) =>
          turn.role === "student" ? (
            <div key={i} className="ml-8 rounded-lg bg-accent-soft p-3 text-sm whitespace-pre-wrap">
              {turn.text}
            </div>
          ) : (
            <CoachTurn key={i} reply={turn.reply} stageKey={stageKey} onApply={onApply} fields={fields} />
          ),
        )}
        {loading && <Spinner label="Coach is thinking…" />}
      </div>

      <ErrorNote message={error} />
      <div className="mt-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder="Type in English or Bahasa Indonesia… (Enter to send)"
          className="flex-1 resize-none rounded-lg border border-line bg-bg p-3 text-sm focus:border-accent focus:outline-none"
        />
        <Button onClick={send} disabled={loading || !input.trim()}>
          Send
        </Button>
      </div>
    </Card>
  );
}

function CoachTurn({
  reply,
  stageKey,
  fields,
  onApply,
}: {
  reply: CoachReply;
  stageKey: StageKey;
  fields: ProjectFields;
  onApply: (key: string, value: string) => void;
}) {
  const stage = STAGES.find((s) => s.key === stageKey)!;
  const readiness = { not_yet: "Keep exploring", almost: "Almost there", ready: "Stage ready ✓" }[reply.stage_readiness];

  return (
    <div className="mr-4 space-y-3 rounded-lg border border-line p-3 text-sm">
      <div>
        <p className="leading-relaxed">{reply.feedback_en}</p>
        <p className="mt-1 text-muted italic">{reply.feedback_l1}</p>
      </div>

      {reply.socratic_questions.map((q, i) => (
        <div key={i} className="rounded-md bg-socratic/50 p-2.5">
          <SocraticTag type={q.type} />
          <p className="mt-1 font-semibold">{q.question_en}</p>
          <p className="text-muted italic">{q.question_l1}</p>
        </div>
      ))}

      {reply.english_upgrade && (
        <div className="rounded-md border border-dashed border-accent/50 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">English upgrade</p>
          <p className="mt-1 text-muted line-through decoration-1">{reply.english_upgrade.student_text}</p>
          <p className="font-semibold">→ {reply.english_upgrade.improved_en}</p>
          <p className="mt-1 text-muted italic">{reply.english_upgrade.explanation_l1}</p>
        </div>
      )}

      {reply.field_suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Suggested canvas text</p>
          {reply.field_suggestions.map((s, i) => {
            const field = stage.fields.find((f) => f.key === s.field_key);
            const applied = fields[s.field_key]?.trim() === s.value_en.trim();
            return (
              <div key={i} className="rounded-md bg-subtle p-2.5">
                <p className="text-xs text-muted">{field?.en}</p>
                <p className="font-medium">{s.value_en}</p>
                <p className="text-muted italic">{s.value_l1}</p>
                <button
                  className="mt-1 text-xs font-semibold text-accent underline disabled:text-muted disabled:no-underline"
                  disabled={applied}
                  onClick={() => onApply(s.field_key, s.value_en)}
                >
                  {applied ? "Added ✓" : "Use this (you can edit it)"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted">{readiness}</p>
    </div>
  );
}
