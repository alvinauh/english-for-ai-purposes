// Design thinking stages used by the Project Studio and the curriculum.
// Field labels are bilingual so the UI can show the learner's language beside English.

export type LearnerLang = "id" | "my" | "km";

export const LEARNER_LANGS: Record<LearnerLang, { name: string; native: string }> = {
  id: { name: "Indonesian", native: "Bahasa Indonesia" },
  my: { name: "Myanmar (Burmese)", native: "မြန်မာဘာသာ" },
  km: { name: "Khmer", native: "ភាសាខ្មែរ" },
};

export type StageKey = "empathize" | "define" | "ideate" | "prototype" | "test";

export interface StageField {
  key: string;
  en: string;
  id: string;
  placeholder: string;
}

export interface Stage {
  key: StageKey;
  week: number;
  en: string;
  id: string;
  goal_en: string;
  goal_id: string;
  fields: StageField[];
}

export const STAGES: Stage[] = [
  {
    key: "empathize",
    week: 1,
    en: "Empathize",
    id: "Berempati",
    goal_en: "Understand the people you are designing for.",
    goal_id: "Pahami orang-orang yang akan kamu bantu.",
    fields: [
      {
        key: "targetUser",
        en: "Who are you designing for?",
        id: "Untuk siapa kamu merancang?",
        placeholder: "e.g. Small food sellers (UMKM) in Yogyakarta",
      },
      {
        key: "context",
        en: "Where and when do they face the problem?",
        id: "Di mana dan kapan mereka menghadapi masalah ini?",
        placeholder: "e.g. Every evening when they post products on Instagram",
      },
      {
        key: "pains",
        en: "What frustrates them?",
        id: "Apa yang membuat mereka frustrasi?",
        placeholder: "e.g. They don't know how to write attractive captions",
      },
      {
        key: "insights",
        en: "What did you learn from talking to them?",
        id: "Apa yang kamu pelajari dari wawancara?",
        placeholder: "e.g. 4 of 5 sellers copy captions from competitors",
      },
    ],
  },
  {
    key: "define",
    week: 2,
    en: "Define",
    id: "Mendefinisikan",
    goal_en: "Turn what you learned into one clear problem.",
    goal_id: "Ubah temuanmu menjadi satu masalah yang jelas.",
    fields: [
      {
        key: "problemStatement",
        en: "Problem statement: [User] needs [need] because [insight].",
        id: "Pernyataan masalah: [Pengguna] butuh [kebutuhan] karena [temuan].",
        placeholder: "Small food sellers need fast, attractive captions because...",
      },
      {
        key: "hmw",
        en: "How might we…?",
        id: "Bagaimana kita bisa…?",
        placeholder: "How might we help sellers write captions in 5 minutes?",
      },
      {
        key: "success",
        en: "What does success look like?",
        id: "Seperti apa keberhasilannya?",
        placeholder: "Sellers post 3x per week and get more comments",
      },
    ],
  },
  {
    key: "ideate",
    week: 2,
    en: "Ideate",
    id: "Mencari Ide",
    goal_en: "Generate many ideas, then choose one.",
    goal_id: "Hasilkan banyak ide, lalu pilih satu.",
    fields: [
      {
        key: "ideas",
        en: "List your ideas (aim for 10+).",
        id: "Tulis ide-idemu (target 10+).",
        placeholder: "1. A caption chatbot on WhatsApp\n2. A caption template book\n3. ...",
      },
      {
        key: "chosenIdea",
        en: "Which idea will you build?",
        id: "Ide mana yang akan kamu buat?",
        placeholder: "A custom AI assistant that writes captions in Indonesian and English",
      },
      {
        key: "whyIdea",
        en: "Why this idea? (impact, effort, fit)",
        id: "Mengapa ide ini? (dampak, usaha, kecocokan)",
        placeholder: "High impact, we can build it in one week with no coding",
      },
    ],
  },
  {
    key: "prototype",
    week: 3,
    en: "Prototype",
    id: "Membuat Prototipe",
    goal_en: "Build a simple version with AI.",
    goal_id: "Bangun versi sederhana dengan bantuan AI.",
    fields: [
      {
        key: "aiRole",
        en: "What job does AI do in your project?",
        id: "Apa tugas AI dalam proyekmu?",
        placeholder: "AI writes 3 caption options from a product photo and price",
      },
      {
        key: "features",
        en: "Main features (3 maximum)",
        id: "Fitur utama (maksimal 3)",
        placeholder: "1. Caption generator\n2. Hashtag suggestions\n3. Price formatting",
      },
      {
        key: "tools",
        en: "Which AI tools will you use?",
        id: "Alat AI apa yang akan kamu gunakan?",
        placeholder: "DeepSeek for writing, Canva for design",
      },
      {
        key: "buildSteps",
        en: "Build steps",
        id: "Langkah-langkah membangun",
        placeholder: "1. Write the system prompt\n2. Test with 5 products\n3. ...",
      },
    ],
  },
  {
    key: "test",
    week: 4,
    en: "Test",
    id: "Menguji",
    goal_en: "Get feedback from real users and improve.",
    goal_id: "Dapatkan masukan dari pengguna nyata dan perbaiki.",
    fields: [
      {
        key: "testers",
        en: "Who will test your prototype?",
        id: "Siapa yang akan menguji prototipemu?",
        placeholder: "3 food sellers from my neighbourhood",
      },
      {
        key: "testQuestions",
        en: "What will you ask them?",
        id: "Apa yang akan kamu tanyakan?",
        placeholder: "Was the caption useful? What would you change?",
      },
      {
        key: "feedback",
        en: "What feedback did you get?",
        id: "Masukan apa yang kamu dapat?",
        placeholder: "Captions were too long; they want emoji options",
      },
      {
        key: "nextIteration",
        en: "What will you change next?",
        id: "Apa yang akan kamu ubah selanjutnya?",
        placeholder: "Add a 'short caption' option to the prompt",
      },
    ],
  },
];

export type ProjectFields = Record<string, string>;

export function stageByKey(key: StageKey): Stage {
  return STAGES.find((s) => s.key === key)!;
}

/** Plain-text summary of everything a student has written, for AI context. */
export function projectToText(fields: ProjectFields): string {
  const lines: string[] = [];
  for (const stage of STAGES) {
    const filled = stage.fields.filter((f) => fields[f.key]?.trim());
    if (!filled.length) continue;
    lines.push(`## ${stage.en}`);
    for (const f of filled) lines.push(`- ${f.en}\n  ${fields[f.key].trim()}`);
  }
  return lines.join("\n") || "(The student has not written anything yet.)";
}
