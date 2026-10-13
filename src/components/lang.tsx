"use client";

import { createContext, useContext } from "react";
import type { LearnerLang } from "@/lib/design-thinking";
import { KEYS, useStored } from "@/lib/store";

const LangContext = createContext<{ lang: LearnerLang; setLang: (l: LearnerLang) => void }>({
  lang: "id",
  setLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useStored<LearnerLang>(KEYS.lang, "id");
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** English text with a gloss in the learner's language underneath (hidden when there is no gloss for it yet). */
export function Bi({ en, id, my, className = "" }: { en: React.ReactNode; id: React.ReactNode; my?: React.ReactNode; className?: string }) {
  const { lang } = useLang();
  const gloss = lang === "id" ? id : lang === "my" ? my : undefined;
  return (
    <span className={className}>
      {en}
      {gloss && <span className="block text-[0.85em] font-normal text-muted italic">{gloss}</span>}
    </span>
  );
}

export function LangSelect() {
  const { lang, setLang } = useLang();
  return (
    <select
      aria-label="Learner language"
      value={lang}
      onChange={(e) => setLang(e.target.value as LearnerLang)}
      className="rounded-md border border-line bg-surface px-2 py-1 text-sm"
    >
      <option value="id">🇮🇩 Bahasa Indonesia</option>
      <option value="my">🇲🇲 မြန်မာဘာသာ</option>
      <option value="km">🇰🇭 ភាសាខ្មែរ (beta)</option>
    </select>
  );
}
