"use client";

import type { ProjectBrief } from "@/lib/schemas";

type Pair = { en: string; l1: string };

function Row({ label, value }: { label: string; value: Pair | Pair[] }) {
  const items = Array.isArray(value) ? value : [value];
  if (!items.length) return null;
  return (
    <div className="grid gap-1 border-t border-line py-3 md:grid-cols-[180px_1fr_1fr] md:gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="text-sm">
        {Array.isArray(value) ? (
          <ul className="list-disc space-y-1 pl-4">{items.map((v, i) => <li key={i}>{v.en}</li>)}</ul>
        ) : (
          <p>{items[0].en}</p>
        )}
      </div>
      <div className="text-sm text-muted italic">
        {Array.isArray(value) ? (
          <ul className="list-disc space-y-1 pl-4">{items.map((v, i) => <li key={i}>{v.l1}</li>)}</ul>
        ) : (
          <p>{items[0].l1}</p>
        )}
      </div>
    </div>
  );
}

export function BriefView({ brief }: { brief: ProjectBrief }) {
  return (
    <div>
      <h3 className="text-2xl font-extrabold">{brief.title.en}</h3>
      <p className="text-muted italic">{brief.title.l1}</p>
      <p className="mt-2 font-medium">{brief.one_liner.en}</p>
      <p className="mb-3 text-sm text-muted italic">{brief.one_liner.l1}</p>
      <Row label="Target user" value={brief.target_user} />
      <Row label="Problem" value={brief.problem_statement} />
      <Row label="How might we" value={brief.how_might_we} />
      <Row label="Solution" value={brief.solution} />
      <Row label="Key features" value={brief.key_features} />
      <Row label="AI's role" value={brief.ai_role} />
      <Row label="Success criteria" value={brief.success_criteria} />
      <Row label="Open questions" value={brief.open_questions} />
      <Row label="First prompt idea" value={brief.first_prompt_idea} />
    </div>
  );
}

export function briefToText(brief: ProjectBrief): string {
  const list = (items: Pair[]) => items.map((i) => `- ${i.en}`).join("\n");
  return [
    `Title: ${brief.title.en}`,
    `Summary: ${brief.one_liner.en}`,
    `Target user: ${brief.target_user.en}`,
    `Problem: ${brief.problem_statement.en}`,
    `How might we: ${brief.how_might_we.en}`,
    `Solution: ${brief.solution.en}`,
    `Key features:\n${list(brief.key_features)}`,
    `AI's role: ${brief.ai_role.en}`,
    `Success criteria:\n${list(brief.success_criteria)}`,
  ].join("\n");
}
