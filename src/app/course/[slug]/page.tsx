import { CoursePage } from "@/components/course-page";
import { COURSE_PAGES } from "@/lib/course";

export const dynamicParams = false;

export function generateStaticParams() {
  return COURSE_PAGES.filter((p) => p.slug !== "overview").map((p) => ({ slug: p.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CoursePage slug={slug} />;
}
