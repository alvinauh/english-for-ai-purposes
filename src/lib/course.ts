import { readFile } from "node:fs/promises";
import path from "node:path";

export const COURSE_PAGES = [
  { slug: "overview", title: "Course overview" },
  { slug: "week-1", title: "Week 1 · Empathize" },
  { slug: "week-2", title: "Week 2 · Define & Ideate" },
  { slug: "week-3", title: "Week 3 · Prototype" },
  { slug: "week-4", title: "Week 4 · Test & Present" },
  { slug: "assessment", title: "Assessment & rubrics" },
] as const;

export async function readCoursePage(slug: string): Promise<string | null> {
  if (!COURSE_PAGES.some((p) => p.slug === slug)) return null;
  return readFile(path.join(process.cwd(), "content", "course", `${slug}.md`), "utf8");
}
