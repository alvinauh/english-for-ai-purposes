import type { Metadata } from "next";
import { Noto_Sans_Myanmar, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { AccountMenu, AuthProvider } from "@/components/auth";
import { LangProvider, LangSelect } from "@/components/lang";
import { THEME_SCRIPT, ThemeToggle } from "@/components/theme";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
// Fallback for Burmese script, which Jakarta does not cover. Many student devices lack a Myanmar font.
const myanmar = Noto_Sans_Myanmar({ variable: "--font-myanmar", subsets: ["myanmar"], weight: ["400", "600", "700"], preload: false });

export const metadata: Metadata = {
  title: "English for AI Building",
  description: "A 4-week English for Specific Purposes course: learn English, design thinking and prompt engineering by building a real project with AI.",
};

const NAV = [
  { href: "/course", label: "Course" },
  { href: "/studio", label: "Project Studio" },
  { href: "/lab", label: "Prompt Lab" },
  { href: "/portfolio", label: "Portfolio" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${jakarta.variable} ${myanmar.variable} font-sans antialiased`}>
        <AuthProvider>
        <LangProvider>
          <header className="sticky top-0 z-10 print:hidden border-b border-line bg-bg/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
              <Link href="/" className="text-lg font-extrabold tracking-tight">
                English for <span className="text-accent">AI Building</span>
              </Link>
              <nav className="flex flex-wrap gap-4 text-sm font-medium text-muted">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="hover:text-ink">
                    {n.label}
                  </Link>
                ))}
              </nav>
              <div className="ml-auto flex flex-wrap items-center gap-3">
                <AccountMenu />
                <ThemeToggle />
                <LangSelect />
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8 print:max-w-none print:p-0">{children}</main>
        </LangProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
