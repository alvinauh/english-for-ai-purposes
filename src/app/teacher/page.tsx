"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth";
import { Button, Card, CopyButton, ErrorNote, Spinner } from "@/components/ui";
import { LEARNER_LANGS, type LearnerLang } from "@/lib/design-thinking";
import { exchanges, KIND_LABELS, STAGES, TASK_NAMES, type LabChat, type StudentKind } from "@/lib/lab-chat";
import { CRAFT_ELEMENTS } from "@/lib/schemas";
import { getJSON, KEYS, postJSON, useStored } from "@/lib/store";
import type { StudentStats } from "@/lib/teacher";

// ---------- Dashboard language: English, Bahasa Indonesia or Myanmar ----------

type UiLang = "en" | "id" | "my";

const T = {
  title: { en: "Teacher dashboard", id: "Dasbor guru", my: "ဆရာ ဒက်ရှ်ဘုတ်" },
  uiLang: { en: "Dashboard language", id: "Bahasa dasbor", my: "ဒက်ရှ်ဘုတ် ဘာသာစကား" },
  classes: { en: "Classes", id: "Kelas", my: "အတန်းများ" },
  newClass: { en: "New class name", id: "Nama kelas baru", my: "အတန်းအမည်သစ်" },
  create: { en: "Create", id: "Buat", my: "ဖန်တီးရန်" },
  noClasses: {
    en: "Create a class, then give students its code to sign up.",
    id: "Buat kelas, lalu berikan kodenya kepada siswa untuk mendaftar.",
    my: "အတန်းတစ်ခု ဖန်တီးပြီး ကျောင်းသားများ စာရင်းသွင်းရန် ကုဒ်ကို ပေးပါ။",
  },
  students: { en: "students", id: "siswa", my: "ကျောင်းသား" },
  joinCode: { en: "Join code for students", id: "Kode gabung untuk siswa", my: "ကျောင်းသားများအတွက် ဝင်ရောက်ကုဒ်" },
  joinHint: {
    en: "Students open the site → Log in → Student: join a class, and type this code.",
    id: "Siswa membuka situs → Masuk → Siswa: gabung kelas, lalu ketik kode ini.",
    my: "ကျောင်းသားများ ဆိုက်ကိုဖွင့် → ဝင်ရောက်ရန် → ကျောင်းသား: အတန်းဝင်ရန် ကိုနှိပ်ပြီး ဤကုဒ်ကို ရိုက်ပါ။",
  },
  exportCsv: { en: "Export class (.csv)", id: "Ekspor kelas (.csv)", my: "အတန်းကို ထုတ်ယူရန် (.csv)" },
  allLangs: { en: "All languages", id: "Semua bahasa", my: "ဘာသာစကား အားလုံး" },
  noStudents: { en: "No students have joined yet.", id: "Belum ada siswa yang bergabung.", my: "ကျောင်းသား မဝင်ရောက်သေးပါ။" },
  name: { en: "Student", id: "Siswa", my: "ကျောင်းသား" },
  chats: { en: "Chats", id: "Chat", my: "Chat" },
  messages: { en: "Messages", id: "Pesan", my: "မက်ဆေ့ချ်" },
  attempts: { en: "Own attempts", id: "Percobaan sendiri", my: "ကိုယ်တိုင်ရေးမှု" },
  craft: { en: "CRAFT first → latest", id: "CRAFT awal → terbaru", my: "CRAFT ပထမ → နောက်ဆုံး" },
  best: { en: "Best", id: "Terbaik", my: "အကောင်းဆုံး" },
  stage: { en: "Stage reached", id: "Tahap dicapai", my: "ရောက်ရှိသည့်အဆင့်" },
  lastActive: { en: "Last active", id: "Terakhir aktif", my: "နောက်ဆုံး အသုံးပြုချိန်" },
  back: { en: "← Back to class", id: "← Kembali ke kelas", my: "← အတန်းသို့ ပြန်သွားရန်" },
  resetPw: { en: "Set new password", id: "Atur kata sandi baru", my: "စကားဝှက်အသစ် သတ်မှတ်ရန်" },
  resetPrompt: {
    en: "New password for this student (at least 6 characters):",
    id: "Kata sandi baru untuk siswa ini (minimal 6 karakter):",
    my: "ဤကျောင်းသားအတွက် စကားဝှက်အသစ် (အနည်းဆုံး ၆ လုံး):",
  },
  resetDone: {
    en: "Password changed. Tell the student their new password.",
    id: "Kata sandi diubah. Beritahu siswa kata sandi barunya.",
    my: "စကားဝှက် ပြောင်းပြီးပါပြီ။ ကျောင်းသားကို စကားဝှက်အသစ် ပြောပြပါ။",
  },
  noChats: { en: "This student has no Prompt Lab chats yet.", id: "Siswa ini belum punya chat Prompt Lab.", my: "ဤကျောင်းသားတွင် Prompt Lab chat မရှိသေးပါ။" },
  chain: { en: "Prompt chain", id: "Rantai prompt", my: "Prompt အဆင့်ဆင့်" },
  studentWrote: { en: "Student wrote", id: "Siswa menulis", my: "ကျောင်းသား ရေးခဲ့သည်" },
  tutorSaid: { en: "Tutor replied", id: "Tutor menjawab", my: "ဆရာ (AI) ပြန်ဖြေသည်" },
  tutorIn: { en: "Show tutor replies in", id: "Tampilkan balasan tutor dalam", my: "ဆရာ့အဖြေကို ပြသမည့် ဘာသာ" },
  studentLang: { en: "student's language", id: "bahasa siswa", my: "ကျောင်းသား၏ ဘာသာ" },
  english: { en: "English", id: "Inggris", my: "အင်္ဂလိပ်" },
  whatWorks: { en: "What works", id: "Yang sudah bagus", my: "ကောင်းသည့်အချက်" },
  tryThis: { en: "Hint given", id: "Petunjuk diberikan", my: "ပေးခဲ့သည့် အကြံပြုချက်" },
  upgrade: { en: "English upgrade", id: "Perbaikan bahasa Inggris", my: "အင်္ဂလိပ်စာ ပြင်ဆင်ချက်" },
  sideQuestion: { en: "question / chat", id: "pertanyaan / obrolan", my: "မေးခွန်း / စကားပြော" },
  growth: { en: "CRAFT score over time", id: "Skor CRAFT dari waktu ke waktu", my: "အချိန်အလိုက် CRAFT ရမှတ်" },
  never: { en: "never", id: "belum pernah", my: "မရှိသေး" },
} satisfies Record<string, Record<UiLang, string>>;

const STAGE_NAMES: Record<string, Record<UiLang, string>> = Object.fromEntries(
  STAGES.map((s) => [s.key, { en: s.en, id: s.id, my: s.my }]),
);

const KIND_NAMES: Record<StudentKind, Record<UiLang, string>> = {
  draft: { en: KIND_LABELS.draft, id: "Ide awal", my: "အိုင်ဒီယာ" },
  answers: { en: KIND_LABELS.answers, id: "Jawaban", my: "အဖြေများ" },
  attempt: { en: KIND_LABELS.attempt, id: "Prompt buatan sendiri", my: "ကိုယ်တိုင်ရေး prompt" },
  message: { en: KIND_LABELS.message, id: "Pesan", my: "မက်ဆေ့ချ်" },
};

// ---------- Types from the teacher API ----------

interface ClassSummary {
  id: string;
  name: string;
  code: string;
  students: number;
  /** Teacher's name and whether it is the viewer's own class (an admin also sees other teachers' classes). */
  teacher?: string;
  mine?: number;
}
interface StudentSummary {
  id: string;
  username: string;
  displayName: string;
  stats: StudentStats;
}
interface StudentDetail {
  student: { id: string; username: string; displayName: string; className: string; classId: string };
  stats: StudentStats;
  chats: LabChat[];
}

const fmtDate = (iso: string | null, ui: UiLang) =>
  iso ? new Date(iso).toLocaleDateString(ui === "id" ? "id-ID" : ui === "my" ? "my-MM" : "en-GB", { day: "numeric", month: "short" }) : "–";

export default function TeacherPage() {
  const { user, loading } = useAuth();
  const [ui, setUi] = useStored<UiLang>(KEYS.teacherLang, "en");
  const t = (k: keyof typeof T) => T[k][ui];

  if (loading) return <Spinner label="Loading…" />;
  if (!user || user.role !== "teacher") {
    return (
      <Card className="mx-auto max-w-md space-y-3 text-center">
        <p>This page is for teachers.</p>
        <Link href="/login?next=/teacher" className="text-accent underline">
          Log in as a teacher
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="mr-auto text-3xl font-extrabold">{t("title")}</h1>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">{t("uiLang")}</span>
          <select
            value={ui}
            onChange={(e) => setUi(e.target.value as UiLang)}
            className="rounded-md border border-line bg-surface px-2 py-1"
          >
            <option value="en">English</option>
            <option value="id">Bahasa Indonesia</option>
            <option value="my">မြန်မာဘာသာ</option>
          </select>
        </label>
      </div>
      <Dashboard ui={ui} t={t} />
    </div>
  );
}

type Tr = (k: keyof typeof T) => string;

function Dashboard({ ui, t }: { ui: UiLang; t: Tr }) {
  const [classes, setClasses] = useState<ClassSummary[] | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    try {
      const { classes } = await getJSON<{ classes: ClassSummary[] }>("/api/teacher/classes");
      setClasses(classes);
      // /teacher?class=<id> opens that class (used by the admin overview).
      const wanted = new URLSearchParams(window.location.search).get("class");
      setClassId((cur) => cur ?? (classes.some((c) => c.id === wanted) ? wanted : (classes[0]?.id ?? null)));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    loadClasses();
  }, [loadClasses]);

  async function createClass(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const { class: c } = await postJSON<{ class: ClassSummary }>("/api/teacher/classes", { name: newName });
      setNewName("");
      setClassId(c.id);
      setStudentId(null);
      await loadClasses();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("classes")}</p>
        {classes === null ? (
          <Spinner label="…" />
        ) : (
          <ul className="space-y-1">
            {classes.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => {
                    setClassId(c.id);
                    setStudentId(null);
                  }}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${c.id === classId ? "bg-accent-soft font-semibold" : "hover:bg-subtle"}`}
                >
                  <span className="block truncate">{c.name}</span>
                  <span className="block text-xs text-muted">
                    {c.code} · {c.students} {t("students")}
                    {!c.mine && c.teacher && ` · ${c.teacher}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={createClass} className="space-y-2 border-t border-line pt-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("newClass")}
            className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
          <Button type="submit" variant="ghost" className="w-full" disabled={!newName.trim()}>
            + {t("create")}
          </Button>
        </form>
      </aside>

      <div className="min-w-0 space-y-4">
        <ErrorNote message={error} />
        {classes?.length === 0 && <Card>{t("noClasses")}</Card>}
        {classId && !studentId && <ClassView key={classId} classId={classId} ui={ui} t={t} onOpen={setStudentId} />}
        {studentId && <StudentView key={studentId} studentId={studentId} ui={ui} t={t} onBack={() => setStudentId(null)} />}
      </div>
    </div>
  );
}

function CraftBoxes({ present }: { present: string[] }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`CRAFT ${present.length}/5`}>
      {CRAFT_ELEMENTS.map((e) => (
        <span
          key={e}
          className={`grid h-5 w-5 place-items-center rounded text-[10px] font-bold ${
            present.includes(e) ? "bg-green-600 text-white" : "bg-subtle text-muted"
          }`}
        >
          {e[0].toUpperCase()}
        </span>
      ))}
    </span>
  );
}

function ClassView({ classId, ui, t, onOpen }: { classId: string; ui: UiLang; t: Tr; onOpen: (id: string) => void }) {
  const [data, setData] = useState<{ class: ClassSummary; students: StudentSummary[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [langFilter, setLangFilter] = useState<LearnerLang | "all">("all");

  useEffect(() => {
    getJSON<{ class: ClassSummary; students: StudentSummary[] }>(`/api/teacher/students?classId=${classId}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [classId]);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Spinner label="…" />;
  const students = data.students.filter((s) => langFilter === "all" || s.stats.langs.includes(langFilter));

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-4">
        <div className="mr-auto">
          <h2 className="text-xl font-bold">{data.class.name}</h2>
          <p className="text-sm text-muted">
            {data.students.length} {t("students")}
          </p>
        </div>
        <div className="text-sm">
          <p className="text-xs text-muted">{t("joinCode")}</p>
          <p className="flex items-center gap-2">
            <span className="font-mono text-2xl font-extrabold tracking-[0.2em]">{data.class.code}</span>
            <CopyButton text={data.class.code} />
          </p>
          <p className="max-w-xs text-xs text-muted">{t("joinHint")}</p>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "id", "my", "km"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLangFilter(l)}
            className={`rounded-full border px-3 py-1 text-sm ${
              langFilter === l ? "border-accent bg-accent-soft font-semibold" : "border-line bg-surface hover:bg-subtle"
            }`}
          >
            {l === "all" ? t("allLangs") : LEARNER_LANGS[l].native}
          </button>
        ))}
        <a
          href={`/api/teacher/export?classId=${classId}`}
          className="ml-auto rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-subtle"
        >
          {t("exportCsv")}
        </a>
      </div>

      {students.length === 0 ? (
        <Card>{t("noStudents")}</Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-subtle text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">{t("name")}</th>
                <th className="px-3 py-2 text-right">{t("chats")}</th>
                <th className="px-3 py-2 text-right">{t("messages")}</th>
                <th className="px-3 py-2 text-right">{t("attempts")}</th>
                <th className="px-3 py-2">{t("craft")}</th>
                <th className="px-3 py-2">{t("stage")}</th>
                <th className="px-3 py-2">{t("lastActive")}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} onClick={() => onOpen(s.id)} className="cursor-pointer border-t border-line hover:bg-accent-soft">
                  <td className="px-3 py-2">
                    <span className="font-semibold">{s.displayName}</span>
                    <span className="block text-xs text-muted">
                      @{s.username} · {s.stats.langs.map((l) => LEARNER_LANGS[l as LearnerLang]?.native ?? l).join(", ") || "–"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.stats.chats}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.stats.messages}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.stats.attempts}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {s.stats.firstCraft === null ? (
                      "–"
                    ) : (
                      <>
                        {s.stats.firstCraft} → <strong>{s.stats.latestCraft}</strong>/5
                        <span className="ml-1 text-xs text-muted">
                          ({t("best")} {s.stats.bestCraft})
                        </span>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2">{s.stats.latestStage ? STAGE_NAMES[s.stats.latestStage]?.[ui] : "–"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{s.stats.lastActive ? fmtDate(s.stats.lastActive, ui) : t("never")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentView({ studentId, ui, t, onBack }: { studentId: string; ui: UiLang; t: Tr; onBack: () => void }) {
  const [data, setData] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [tutorInL1, setTutorInL1] = useState(true);

  useEffect(() => {
    getJSON<StudentDetail>(`/api/teacher/students/${studentId}`)
      .then((d) => {
        setData(d);
        setChatId(d.chats[0]?.id ?? null);
      })
      .catch((e) => setError(e.message));
  }, [studentId]);

  async function resetPassword() {
    const pw = prompt(t("resetPrompt"));
    if (!pw) return;
    try {
      await postJSON(`/api/teacher/students/${studentId}`, { password: pw });
      alert(t("resetDone"));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Spinner label="…" />;
  const chat = data.chats.find((c) => c.id === chatId);
  const s = data.stats;
  // CRAFT score of every checked message, oldest first, across all chats.
  const timeline = data.chats
    .flatMap((c) => exchanges(c))
    .filter((x) => x.craft)
    .sort((a, b) => a.student.at.localeCompare(b.student.at));

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-accent hover:underline">
        {t("back")}
      </button>
      <Card className="flex flex-wrap items-start gap-4">
        <div className="mr-auto">
          <h2 className="text-xl font-bold">{data.student.displayName}</h2>
          <p className="text-sm text-muted">
            @{data.student.username} · {data.student.className}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <dt className="text-xs text-muted">{t("chats")}</dt>
            <dd className="text-2xl font-extrabold tabular-nums">{s.chats}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t("attempts")}</dt>
            <dd className="text-2xl font-extrabold tabular-nums">{s.attempts}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t("craft")}</dt>
            <dd className="text-2xl font-extrabold tabular-nums">{s.firstCraft === null ? "–" : `${s.firstCraft}→${s.latestCraft}`}</dd>
          </div>
        </dl>
        <Button variant="ghost" className="!px-2.5 !py-1 text-xs" onClick={resetPassword}>
          {t("resetPw")}
        </Button>
      </Card>

      {timeline.length > 1 && (
        <Card className="space-y-2">
          <p className="text-sm font-bold">{t("growth")}</p>
          <div className="flex h-16 items-end gap-1">
            {timeline.map((x) => (
              <span
                key={x.student.id}
                title={`${fmtDate(x.student.at, ui)} · ${x.craft!.score}/5`}
                className={`w-3 rounded-t ${x.attemptNo ? "bg-accent" : "bg-accent/40"}`}
                style={{ height: `${Math.max(x.craft!.score, 0.3) * 20}%` }}
              />
            ))}
          </div>
          <p className="text-xs text-muted">
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-accent" />
            {KIND_NAMES.attempt[ui]} · <span className="mx-1 inline-block h-2 w-2 rounded-sm bg-accent/40" />
            {KIND_NAMES.draft[ui]} / {KIND_NAMES.answers[ui]}
          </p>
        </Card>
      )}

      {data.chats.length === 0 ? (
        <Card>{t("noChats")}</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <ul className="space-y-1">
            {data.chats.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setChatId(c.id)}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${c.id === chatId ? "bg-accent-soft font-semibold" : "hover:bg-subtle"}`}
                >
                  <span className="block truncate">{c.title}</span>
                  <span className="block text-xs text-muted">
                    {fmtDate(c.updatedAt, ui)} · {LEARNER_LANGS[c.lang ?? "id"].native}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {chat && (
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <h3 className="mr-auto font-bold">
                  {t("chain")}: {chat.title}
                  <span className="block text-xs font-normal text-muted">
                    {TASK_NAMES[chat.task]} · {LEARNER_LANGS[chat.lang ?? "id"].native}
                  </span>
                </h3>
                <span className="text-muted">{t("tutorIn")}</span>
                {[true, false].map((l1) => (
                  <button
                    key={String(l1)}
                    onClick={() => setTutorInL1(l1)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      tutorInL1 === l1 ? "border-accent bg-accent-soft font-semibold" : "border-line bg-surface"
                    }`}
                  >
                    {l1 ? t("studentLang") : t("english")}
                  </button>
                ))}
              </div>
              <ChainView chat={chat} ui={ui} t={t} tutorInL1={tutorInL1} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChainView({ chat, ui, t, tutorInL1 }: { chat: LabChat; ui: UiLang; t: Tr; tutorInL1: boolean }) {
  return (
    <ol className="space-y-3">
      {exchanges(chat).map((x) => {
        const r = x.tutor;
        const up = r?.attempt_feedback?.english_upgrade;
        return (
          <li key={x.student.id} className="rounded-xl border border-line bg-surface p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-muted">#{x.n}</span>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">
                {KIND_NAMES[x.student.kind][ui]}
                {x.attemptNo && ` ${x.attemptNo}`}
              </span>
              {r && <span className="text-muted">→ {STAGE_NAMES[r.stage]?.[ui] ?? r.stage}</span>}
              <span className="ml-auto">
                {x.craft ? <CraftBoxes present={x.craft.present} /> : <span className="text-muted">{t("sideQuestion")}</span>}
              </span>
            </div>
            <p className="text-xs font-semibold uppercase text-muted">{t("studentWrote")}</p>
            <p className="mb-3 whitespace-pre-wrap">{x.student.text}</p>
            {r && (
              <div className="space-y-2 border-t border-line pt-2 text-sm">
                <p className="text-xs font-semibold uppercase text-muted">{t("tutorSaid")}</p>
                <p>{tutorInL1 ? r.reply_l1 : r.reply_en}</p>
                {r.attempt_feedback && (
                  <div className="grid gap-2 md:grid-cols-2">
                    <p className="rounded-lg bg-green-50 p-2 dark:bg-green-950/40">
                      <strong>{t("whatWorks")}:</strong> {r.attempt_feedback.strengths_en}
                    </p>
                    <p className="rounded-lg bg-subtle p-2">
                      <strong>{t("tryThis")}:</strong> {r.attempt_feedback.improve_en}
                    </p>
                  </div>
                )}
                {up && (
                  <p className="text-xs">
                    <strong>{t("upgrade")}:</strong> “{up.student_text}” → “{up.improved_en}”
                    <span className="block text-muted">{up.explanation_l1}</span>
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
