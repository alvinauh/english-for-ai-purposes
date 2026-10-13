import Link from "next/link";
import { COURSE_PAGES } from "@/lib/course";

export function CourseNav({ current }: { current: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto text-sm lg:sticky lg:top-20 lg:flex-col">
      {COURSE_PAGES.map((p) => (
        <Link
          key={p.slug}
          href={p.slug === "overview" ? "/course" : `/course/${p.slug}`}
          className={`shrink-0 rounded-lg px-3 py-2 ${
            p.slug === current ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-subtle hover:text-ink"
          }`}
        >
          {p.title}
        </Link>
      ))}
    </nav>
  );
}
