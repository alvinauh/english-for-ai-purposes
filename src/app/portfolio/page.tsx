"use client";

import Link from "next/link";
import { BriefView } from "@/components/brief-view";
import { Bi } from "@/components/lang";
import { Button, Card, CopyButton } from "@/components/ui";
import { STAGES, type ProjectFields } from "@/lib/design-thinking";
import type { ProjectBrief } from "@/lib/schemas";
import { KEYS, useStored, type JournalEntry } from "@/lib/store";

export default function PortfolioPage() {
  const [brief] = useStored<ProjectBrief | null>(KEYS.brief, null);
  const [fields] = useStored<ProjectFields>(KEYS.fields, {});
  const [journal, setJournal] = useStored<JournalEntry[]>(KEYS.journal, []);

  function exportMarkdown() {
    const out: string[] = ["# My English for AI Building Portfolio", ""];
    if (brief) {
      out.push(`## Project brief: ${brief.title.en}`, "", brief.one_liner.en, "");
      out.push(`- **Target user:** ${brief.target_user.en}`);
      out.push(`- **Problem:** ${brief.problem_statement.en}`);
      out.push(`- **How might we:** ${brief.how_might_we.en}`);
      out.push(`- **Solution:** ${brief.solution.en}`);
      out.push(`- **AI's role:** ${brief.ai_role.en}`);
      out.push(`- **Key features:**`, ...brief.key_features.map((f) => `  - ${f.en}`));
      out.push(`- **Success criteria:**`, ...brief.success_criteria.map((f) => `  - ${f.en}`), "");
    }
    out.push("## Design thinking canvas", "");
    for (const s of STAGES) {
      out.push(`### ${s.en}`);
      for (const f of s.fields) out.push(`**${f.en}**`, "", fields[f.key]?.trim() || "_(empty)_", "");
    }
    out.push("## Prompt log", "");
    [...journal].reverse().forEach((j, i) => {
      out.push(`### Prompt ${i + 1} (${j.level}, ${new Date(j.createdAt).toLocaleDateString()})`, "");
      out.push("**My original idea:**", "", `> ${j.draft.replace(/\n/g, "\n> ")}`, "");
      out.push("**Final English prompt:**", "", "```", j.prompt_en, "```", "");
      out.push("**Reflection:**", "", j.reflection.trim() || "_(not written yet)_", "");
    });
    const blob = new Blob([out.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "english-for-ai-building-portfolio.md";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-3xl font-extrabold">Portfolio</h1>
          <p className="text-muted italic">Kumpulan hasil kerjamu untuk penilaian akhir.</p>
        </div>
        <Button onClick={exportMarkdown}>Download portfolio (.md)</Button>
      </div>

      <Card>
        {brief ? (
          <BriefView brief={brief} />
        ) : (
          <p className="text-muted">
            No project brief yet. Create one in the <Link href="/studio" className="text-accent underline">Project Studio</Link>.
          </p>
        )}
      </Card>

      <div className="space-y-3">
        <h2 className="text-xl font-bold">
          <Bi en={`Prompt log (${journal.length})`} id="Catatan prompt" />
        </h2>
        {journal.length === 0 && (
          <p className="text-muted">
            Save prompts from the <Link href="/lab" className="text-accent underline">Prompt Lab</Link> to build your log.
          </p>
        )}
        {journal.map((j) => (
          <Card key={j.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="rounded-full bg-accent-soft px-2 py-0.5 font-bold uppercase text-accent">{j.level}</span>
              {new Date(j.createdAt).toLocaleString()}
              <div className="ml-auto flex gap-2">
                <CopyButton text={j.prompt_en} />
                <button
                  className="underline"
                  onClick={() => confirm("Delete this prompt?") && setJournal((all) => all.filter((x) => x.id !== j.id))}
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="text-sm text-muted">Original idea: “{j.draft}”</p>
            <pre className="rounded-lg bg-subtle p-3 font-sans text-sm whitespace-pre-wrap">{j.prompt_en}</pre>
            <label className="block space-y-1">
              <span className="text-sm font-semibold">
                <Bi
                  en="Reflection: What happened when you used this prompt? What would you change?"
                  id="Refleksi: Apa yang terjadi saat kamu memakai prompt ini? Apa yang akan kamu ubah?"
                />
              </span>
              <textarea
                value={j.reflection}
                onChange={(e) =>
                  setJournal((all) => all.map((x) => (x.id === j.id ? { ...x, reflection: e.target.value } : x)))
                }
                rows={3}
                placeholder="When I used this prompt in DeepSeek, the result was… Next time I will…"
                className="w-full rounded-lg border border-line bg-bg p-3 text-sm focus:border-accent focus:outline-none"
              />
            </label>
          </Card>
        ))}
      </div>
    </div>
  );
}
