import { z } from "zod";

// "l1" = the learner's first language (Indonesian or Myanmar now, Khmer later).
const Bi = z.object({ en: z.string(), l1: z.string() });

export const SOCRATIC_TYPES = [
  "clarification",
  "assumptions",
  "evidence",
  "viewpoints",
  "implications",
  "meta",
] as const;

const SocraticQuestion = z.object({
  type: z.enum(SOCRATIC_TYPES),
  question_en: z.string(),
  question_l1: z.string(),
});

// ---------- Project Studio coach ----------

export const CoachReply = z.object({
  feedback_en: z.string().describe("2-4 short sentences of encouraging, specific feedback in simple English (CEFR B1)."),
  feedback_l1: z.string().describe("The same feedback in the learner's language."),
  socratic_questions: z.array(SocraticQuestion).describe("1-2 questions that push the student's thinking further."),
  english_upgrade: z
    .object({
      student_text: z.string().describe("A short phrase or sentence the student actually wrote."),
      improved_en: z.string().describe("A more natural, accurate English version."),
      explanation_l1: z.string().describe("Why it is better, in the learner's language, one or two sentences."),
    })
    .nullable()
    .describe("Null if the student wrote nothing in English worth improving."),
  field_suggestions: z
    .array(z.object({ field_key: z.string(), value_en: z.string(), value_l1: z.string() }))
    .describe("Drafts for canvas fields, based ONLY on what the student said. Empty if not enough information."),
  stage_readiness: z.enum(["not_yet", "almost", "ready"]),
});
export type CoachReply = z.infer<typeof CoachReply>;

export const ProjectBrief = z.object({
  title: Bi,
  one_liner: Bi,
  target_user: Bi,
  problem_statement: Bi,
  how_might_we: Bi,
  solution: Bi,
  key_features: z.array(Bi),
  ai_role: Bi,
  success_criteria: z.array(Bi),
  open_questions: z.array(Bi).describe("Gaps the student still needs to fill, phrased as questions."),
  first_prompt_idea: Bi.describe("A rough first prompt the student could take to the Prompt Lab."),
});
export type ProjectBrief = z.infer<typeof ProjectBrief>;

// ---------- Prompt Lab ----------

export const CRAFT_ELEMENTS = ["context", "role", "action", "format", "tone"] as const;

export const SCAFFOLD_STAGES = ["explore", "guided", "independent", "polish"] as const;
export type ScaffoldStage = (typeof SCAFFOLD_STAGES)[number];

export const NEXT_ACTIONS = ["answer_questions", "write_own_version", "revise_again", "test_in_ai", "ask_anything"] as const;

// One tutor turn in the Prompt Lab chat chain.
export const PromptLabResult = z.object({
  stage: z.enum(SCAFFOLD_STAGES).describe("Where the student is in the scaffold after this turn."),
  reply_en: z.string().describe("A short, warm chat reply in simple English (2-4 sentences). Answers any question the student asked."),
  reply_l1: z.string().describe("The same reply in the learner's language."),
  detected_language: z.string(),
  understanding_l1: z
    .string()
    .describe("What the AI understood the student wants, in the learner's language. Empty string if this turn is not about a new or changed idea."),
  direct_translation_en: z
    .string()
    .describe("A faithful English translation of the student's latest message if it was not in English. No additions. Empty string otherwise."),
  attempt_feedback: z
    .object({
      strengths_en: z.string(),
      strengths_l1: z.string(),
      improve_en: z.string().describe("The ONE or TWO most useful changes, as hints — not a full rewrite."),
      improve_l1: z.string(),
      english_upgrade: z
        .object({ student_text: z.string(), improved_en: z.string(), explanation_l1: z.string() })
        .nullable(),
    })
    .nullable()
    .describe("Feedback on a prompt the student wrote themselves. Null unless the latest message is the student's own prompt attempt."),
  craft_check: z
    .array(
      z.object({
        element: z.enum(CRAFT_ELEMENTS),
        present: z.boolean(),
        tip_en: z.string(),
        tip_l1: z.string(),
      }),
    )
    .describe("All five CRAFT elements for the student's current prompt (draft or attempt). Empty array for a side question."),
  clarifying_questions: z.array(SocraticQuestion).describe("0-4 Socratic questions whose answers would make the prompt better."),
  sentence_frames: z
    .array(z.object({ frame_en: z.string(), hint_l1: z.string() }))
    .describe("Sentence starters with blanks (___) that help the student write their own prompt. Give 3-5 when asking them to write their own version, otherwise empty."),
  options: z
    .array(
      z.object({
        level: z.enum(["starter", "structured", "advanced"]),
        title_en: z.string(),
        prompt_en: z.string(),
        prompt_l1: z.string(),
        why_it_works_en: z.string(),
        why_it_works_l1: z.string(),
        techniques: z.array(z.string()),
      }),
    )
    .describe("Model prompts. Exactly three (starter, structured, advanced) or an empty array — see the scaffold rules."),
  vocabulary: z.array(z.object({ term_en: z.string(), meaning_l1: z.string(), example_en: z.string() })),
  grammar_tip: z.object({ point_en: z.string(), explanation_l1: z.string(), example_en: z.string() }).nullable(),
  next_step: z.object({
    action: z.enum(NEXT_ACTIONS),
    en: z.string().describe("One clear instruction for what the student should do next."),
    l1: z.string(),
  }),
});
export type PromptLabResult = z.infer<typeof PromptLabResult>;

export const TASK_TYPES = ["write", "build", "image", "research", "learn"] as const;
export type TaskType = (typeof TASK_TYPES)[number];
