import Link from "next/link";

const WEEKS = [
  { n: 1, stage: "Empathize", title: "Talking to people, talking to AI", out: "Empathy map + interview insights" },
  { n: 2, stage: "Define + Ideate", title: "From problem to ideas", out: "Project brief" },
  { n: 3, stage: "Prototype", title: "Building with AI", out: "Working prototype + prompt log" },
  { n: 4, stage: "Test + Present", title: "Feedback, improve, pitch", out: "Final project + 3-minute pitch" },
];

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-center">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">English for Specific Purposes · 4 weeks</p>
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
            Learn English by building a real project with AI.
          </h1>
          <p className="text-lg text-muted italic">
            Belajar bahasa Inggris sambil membangun proyek nyata dengan AI.
          </p>
          <p className="max-w-xl leading-relaxed">
            Think like a designer, ask better questions, and write prompts that work. Write your ideas in
            Bahasa Indonesia — the app helps you turn them into clear English and shows you why each
            change matters.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/studio" className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-strong">
              Start your project →
            </Link>
            <Link href="/course" className="rounded-lg border border-line bg-surface px-5 py-2.5 font-semibold hover:bg-subtle">
              See the 4-week plan
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 text-sm shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase text-muted">You write</p>
          <p className="mb-4 rounded-lg bg-subtle p-3">buatin caption jualan keripik pedas buat instagram</p>
          <p className="mb-1 text-xs font-semibold uppercase text-muted">Prompt Lab gives you</p>
          <p className="rounded-lg bg-accent-soft p-3 leading-relaxed">
            <strong>Role:</strong> You are a social media copywriter for small Indonesian food businesses.
            <br />
            <strong>Action:</strong> Write 3 Instagram captions for spicy cassava chips…
            <br />
            <span className="text-muted italic">+ Indonesian translation, CRAFT check, vocabulary and Socratic questions</span>
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            href: "/studio",
            title: "1 · Project Studio",
            id: "Rancang proyekmu",
            body: "Plan your project with design thinking. A Socratic coach asks questions — it never does the thinking for you — and turns your answers into a project brief.",
          },
          {
            href: "/lab",
            title: "2 · Prompt Lab",
            id: "Latih prompt-mu",
            body: "Write a rough idea in any language. Get a faithful translation, three expanded English prompts with Indonesian side-by-side, and tips on what to improve.",
          },
          {
            href: "/portfolio",
            title: "3 · Portfolio",
            id: "Kumpulkan hasil kerjamu",
            body: "Save your best prompts, write what happened when you used them, and export your project brief and prompt log for final assessment.",
          },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="rounded-xl border border-line bg-surface p-5 transition hover:border-accent">
            <h2 className="font-bold">{c.title}</h2>
            <p className="mb-2 text-sm text-muted italic">{c.id}</p>
            <p className="text-sm leading-relaxed">{c.body}</p>
          </Link>
        ))}
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">The 4-week journey</h2>
        <ol className="grid gap-3 md:grid-cols-4">
          {WEEKS.map((w) => (
            <li key={w.n}>
              <Link href={`/course/week-${w.n}`} className="block h-full rounded-xl border border-line bg-surface p-4 hover:border-accent">
                <p className="text-xs font-semibold uppercase text-accent">Week {w.n} · {w.stage}</p>
                <p className="mt-1 font-bold">{w.title}</p>
                <p className="mt-2 text-sm text-muted">Output: {w.out}</p>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
