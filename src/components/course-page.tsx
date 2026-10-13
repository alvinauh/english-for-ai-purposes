import { notFound } from "next/navigation";
import { CourseNav } from "@/components/course-nav";
import { Markdown } from "@/components/markdown";
import { readCoursePage } from "@/lib/course";

export async function CoursePage({ slug }: { slug: string }) {
  const source = await readCoursePage(slug);
  if (!source) notFound();
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside>
        <CourseNav current={slug} />
      </aside>
      <article className="min-w-0 rounded-xl border border-line bg-surface p-5 md:p-8">
        <Markdown source={source} />
      </article>
    </div>
  );
}
