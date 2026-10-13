import { LEARNER_LANGS, type LearnerLang } from "./design-thinking";
import { CRAFT_ELEMENTS, type PromptLabResult, type ScaffoldStage, type TaskType } from "./schemas";

// A Prompt Lab conversation, saved in the browser (see KEYS.labChats).

export type StudentKind = "draft" | "answers" | "attempt" | "message";

export type LabTurn =
  | { id: string; role: "student"; kind: StudentKind; text: string; at: string }
  | { id: string; role: "tutor"; result: PromptLabResult; at: string };

export interface LabChat {
  id: string;
  title: string;
  task: TaskType;
  /** The learner language the chat was held in. Missing on chats saved before Myanmar was added (= "id"). */
  lang?: LearnerLang;
  useBrief: boolean;
  createdAt: string;
  updatedAt: string;
  turns: LabTurn[];
}

export const STAGES: { key: ScaffoldStage; en: string; id: string; my: string }[] = [
  { key: "explore", en: "Share your idea", id: "Ceritakan idemu", my: "သင့်အိုင်ဒီယာကို ပြောပြပါ" },
  { key: "guided", en: "Answer & think", id: "Jawab & berpikir", my: "ဖြေပြီး စဉ်းစားပါ" },
  { key: "independent", en: "Write your own", id: "Tulis sendiri", my: "ကိုယ်တိုင် ရေးပါ" },
  { key: "polish", en: "Polish & test", id: "Poles & uji", my: "ပြင်ဆင်ပြီး စမ်းသပ်ပါ" },
];

export const KIND_LABELS: Record<StudentKind, string> = {
  draft: "My idea",
  answers: "My answers",
  attempt: "My prompt attempt",
  message: "Me",
};

export const TASK_NAMES: Record<TaskType, string> = {
  write: "Write content",
  build: "Build an app / chatbot",
  image: "Create an image",
  research: "Research & analyse",
  learn: "Learn a topic",
};

/**
 * A random id. crypto.randomUUID() only exists on https/localhost, and the site is also served over
 * plain http, so fall back to getRandomValues (available everywhere) in the same UUID v4 format.
 */
export function uid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function newChat(task: TaskType, useBrief: boolean, lang: LearnerLang): LabChat {
  const now = new Date().toISOString();
  return { id: uid(), title: "New chat", task, lang, useBrief, createdAt: now, updatedAt: now, turns: [] };
}

export const chatLang = (chat: LabChat): LearnerLang => chat.lang ?? "id";

export function latestTutor(chat: LabChat | undefined): PromptLabResult | null {
  const t = chat?.turns.findLast((t) => t.role === "tutor");
  return t?.role === "tutor" ? t.result : null;
}

/** A compact text version of a tutor turn, sent back to the AI as chat history. */
function tutorToText(r: PromptLabResult): string {
  const out = [`[stage: ${r.stage}] ${r.reply_en}`];
  if (r.attempt_feedback) out.push(`Feedback: ${r.attempt_feedback.strengths_en} Hints: ${r.attempt_feedback.improve_en}`);
  if (r.clarifying_questions.length) out.push("Questions:\n" + r.clarifying_questions.map((q) => `- ${q.question_en}`).join("\n"));
  const structured = r.options.find((o) => o.level === "structured");
  if (structured) out.push(`Model prompt (structured):\n${structured.prompt_en}`);
  if (r.sentence_frames.length) out.push("Sentence frames:\n" + r.sentence_frames.map((f) => `- ${f.frame_en}`).join("\n"));
  out.push(`Next step: ${r.next_step.en}`);
  return out.join("\n\n").slice(0, 6000);
}

export function chatHistory(chat: LabChat) {
  return chat.turns.map((t) =>
    t.role === "student"
      ? { role: "student" as const, text: `(${t.kind}) ${t.text}`.slice(0, 6000) }
      : { role: "tutor" as const, text: tutorToText(t.result) },
  );
}

const quote = (s: string) => `> ${s.replace(/\n/g, "\n> ")}`;

export interface StudentInfo {
  name: string;
  group: string;
}

export function chatToMarkdown(chat: LabChat, student: StudentInfo): string {
  const out = [
    `# Prompt Lab chat: ${chat.title}`,
    "",
    ...(student.name.trim() ? [`**Student:** ${student.name.trim()}  `] : []),
    ...(student.group.trim() ? [`**Class / group:** ${student.group.trim()}  `] : []),
    `**Date:** ${new Date(chat.createdAt).toLocaleString()}  `,
    `**Language:** ${LEARNER_LANGS[chatLang(chat)].name}  `,
    `**Task:** ${TASK_NAMES[chat.task]}`,
    "",
  ];
  const chain = exchanges(chat);
  if (chain.length) {
    out.push("## Prompt chain", "", "| # | Student wrote | Stage after | CRAFT |", "|---|---|---|---|");
    for (const x of chain) {
      const cell = x.student.text.replace(/\s+/g, " ").replace(/\|/g, "\\|").slice(0, 80);
      out.push(`| ${x.n} | ${KIND_LABELS[x.student.kind]}: ${cell} | ${x.tutor?.stage ?? ""} | ${craftCell(x.craft)} |`);
    }
    out.push("");
  }
  for (const t of chat.turns) {
    if (t.role === "student") {
      out.push(`## 🧑‍🎓 ${KIND_LABELS[t.kind]}`, "", quote(t.text), "");
      continue;
    }
    const r = t.result;
    const stage = STAGES.find((s) => s.key === r.stage);
    out.push(`## 🤖 Tutor · ${stage?.en ?? r.stage}`, "", r.reply_en, "", `_${r.reply_l1}_`, "");
    if (r.understanding_l1) out.push(`**What the AI understood:** ${r.understanding_l1}`, "");
    if (r.direct_translation_en) out.push(`**Direct translation:** ${r.direct_translation_en}`, "");
    if (r.attempt_feedback) {
      const f = r.attempt_feedback;
      out.push(`**What works:** ${f.strengths_en}`, "", `**Try this:** ${f.improve_en}`, "");
      if (f.english_upgrade) {
        out.push(`**English upgrade:** "${f.english_upgrade.student_text}" → "${f.english_upgrade.improved_en}" (${f.english_upgrade.explanation_l1})`, "");
      }
    }
    if (r.craft_check.length) {
      out.push("**CRAFT check:**", "");
      for (const c of r.craft_check) out.push(`- ${c.present ? "✓" : "○"} **${c.element}**: ${c.tip_en}`);
      out.push("");
    }
    for (const o of r.options) {
      out.push(`### ${o.level}: ${o.title_en}`, "", "```", o.prompt_en, "```", "", `_Why it works:_ ${o.why_it_works_en}`, "");
    }
    if (r.sentence_frames.length) {
      out.push("**Sentence frames:**", "", ...r.sentence_frames.map((f) => `- ${f.frame_en} _(${f.hint_l1})_`), "");
    }
    if (r.clarifying_questions.length) {
      out.push("**Questions to think about:**", "", ...r.clarifying_questions.map((q) => `- ${q.question_en} _(${q.question_l1})_`), "");
    }
    if (r.vocabulary.length) {
      out.push("**Vocabulary:**", "", ...r.vocabulary.map((v) => `- **${v.term_en}**: ${v.meaning_l1} (e.g. _${v.example_en}_)`), "");
    }
    if (r.grammar_tip) out.push(`**Grammar:** ${r.grammar_tip.point_en}: ${r.grammar_tip.example_en}`, "");
    out.push(`**➡ Next step:** ${r.next_step.en}`, "");
  }
  return out.join("\n");
}

// ---------- Prompt chain analysis ----------

type StudentTurn = Extract<LabTurn, { role: "student" }>;

export interface Exchange {
  n: number;
  student: StudentTurn;
  tutor: PromptLabResult | null;
  /** Which of the student's own prompt attempts this is (1, 2, …), or null for other messages. */
  attemptNo: number | null;
  /** The tutor's CRAFT check of this student message, or null if it did not do one (side question). */
  craft: { score: number; present: string[]; missing: string[] } | null;
}

/** Pairs each student message with the tutor reply to it: the unit of the prompt chain. */
export function exchanges(chat: LabChat): Exchange[] {
  const out: Exchange[] = [];
  let attempts = 0;
  chat.turns.forEach((t, i) => {
    if (t.role !== "student") return;
    const next = chat.turns[i + 1];
    const tutor = next?.role === "tutor" ? next.result : null;
    const checks = tutor?.craft_check ?? [];
    const present = CRAFT_ELEMENTS.filter((e) => checks.some((c) => c.element === e && c.present));
    out.push({
      n: out.length + 1,
      student: t,
      tutor,
      attemptNo: t.kind === "attempt" ? ++attempts : null,
      craft: checks.length ? { score: present.length, present, missing: CRAFT_ELEMENTS.filter((e) => !present.includes(e)) } : null,
    });
  });
  return out;
}

function craftCell(craft: Exchange["craft"]) {
  return craft ? `${craft.score}/5 ${craft.present.map((e) => e[0].toUpperCase()).join("")}` : "–";
}

const CSV_COLUMNS = [
  "student_name",
  "class_group",
  "chat_id",
  "chat_title",
  "learner_language",
  "task",
  "exchange_no",
  "sent_at",
  "student_kind",
  "attempt_no",
  "student_text",
  "student_char_count",
  "detected_language",
  "stage_after",
  "craft_score",
  "craft_present",
  "craft_missing",
  "feedback_strengths",
  "feedback_hints",
  "english_upgrade_from",
  "english_upgrade_to",
  "model_prompts_given",
  "questions_asked",
  "sentence_frames_given",
  "next_action",
  "tutor_reply_en",
  "tutor_reply_l1",
  "direct_translation_en",
] as const;

const csvCell = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per student message + tutor reply, across all chats. Opens cleanly in Excel / Google Sheets. */
export function chatsToCSV(chats: LabChat[], student: StudentInfo): string {
  return studentsToCSV([{ chats, student }]);
}

/** The same CSV for several students at once (the teacher's class export). */
export function studentsToCSV(groups: { chats: LabChat[]; student: StudentInfo }[]): string {
  const rows: string[] = [CSV_COLUMNS.join(",")];
  for (const { chats, student } of groups) for (const chat of chats) {
    for (const x of exchanges(chat)) {
      const r = x.tutor;
      const up = r?.attempt_feedback?.english_upgrade;
      const row: Record<(typeof CSV_COLUMNS)[number], string | number | null | undefined> = {
        student_name: student.name.trim(),
        class_group: student.group.trim(),
        chat_id: chat.id,
        chat_title: chat.title,
        learner_language: chatLang(chat),
        task: chat.task,
        exchange_no: x.n,
        sent_at: x.student.at,
        student_kind: x.student.kind,
        attempt_no: x.attemptNo,
        student_text: x.student.text,
        student_char_count: [...x.student.text].length, // not words: Burmese has no spaces between words
        detected_language: r?.detected_language,
        stage_after: r?.stage,
        craft_score: x.craft?.score,
        craft_present: x.craft?.present.join(" "),
        craft_missing: x.craft?.missing.join(" "),
        feedback_strengths: r?.attempt_feedback?.strengths_en,
        feedback_hints: r?.attempt_feedback?.improve_en,
        english_upgrade_from: up?.student_text,
        english_upgrade_to: up?.improved_en,
        model_prompts_given: r?.options.length,
        questions_asked: r?.clarifying_questions.length,
        sentence_frames_given: r?.sentence_frames.length,
        next_action: r?.next_step.action,
        tutor_reply_en: r?.reply_en,
        tutor_reply_l1: r?.reply_l1,
        direct_translation_en: r?.direct_translation_en,
      };
      rows.push(CSV_COLUMNS.map((c) => csvCell(row[c])).join(","));
    }
  }
  // BOM so Excel reads Burmese / Indonesian text as UTF-8.
  return "\uFEFF" + rows.join("\r\n");
}

export const EXPORT_FORMAT = "english-for-ai-building/prompt-lab";

export function chatsToJSON(chats: LabChat[], student: StudentInfo): string {
  return JSON.stringify(
    { format: EXPORT_FORMAT, version: 1, exported_at: new Date().toISOString(), student, chats },
    null,
    2,
  );
}

/** Reads a file made by chatsToJSON. Throws a readable error for anything else. */
export function parseChatsJSON(text: string): LabChat[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  const d = data as { format?: string; chats?: unknown };
  if (d?.format !== EXPORT_FORMAT || !Array.isArray(d.chats)) throw new Error("This is not a Prompt Lab export file.");
  return (d.chats as LabChat[]).filter((c) => c && typeof c.id === "string" && Array.isArray(c.turns));
}

export const fileSlug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export function downloadText(filename: string, text: string, type = "text/markdown") {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
