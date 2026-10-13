# English for AI Building

A 4-week **English for Specific Purposes** course where Indonesian (and later Cambodian) students learn English, design thinking, Socratic questioning and prompt engineering by **building a real project with AI**.

## What's inside

| Part | Route | What it does |
|---|---|---|
| Course | `/course` | Overview, 4 weekly lesson plans (3 × 2 h sessions each), assessment rubrics. Source: `content/course/*.md`. Edit the Markdown to change the course. |
| Project Studio | `/studio` | Design-thinking canvas (Empathize → Define → Ideate → Prototype → Test) with a **Socratic coach** that asks questions, suggests English upgrades and drafts canvas text from the student's own words. Generates a bilingual **project brief**. |
| Prompt Lab | `/lab` | Student writes a rough prompt in Indonesian/English/mixed → what the AI understood, direct translation, CRAFT check, **3 expanded English prompts** (Starter / Structured / Advanced) each with a translation, Socratic questions to refine, vocabulary and a grammar tip. |
| Portfolio | `/portfolio` | Saved prompts with reflections; exports brief + canvas + prompt log as Markdown for assessment. |

Student work is stored in the browser (localStorage). No accounts and no database.

## Setup

```bash
cp .env.example .env.local   # add DEEPSEEK_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

Production: `npm run build && npm start`.

## AI details

- `src/lib/ai.ts` calls DeepSeek's OpenAI-compatible Chat Completions API (`https://api.deepseek.com`) in JSON mode. The Zod schema from `src/lib/schemas.ts` is converted to JSON Schema and put in the system prompt; the reply is validated with Zod and retried once if it doesn't match.
- System prompts live in `src/lib/prompts.ts` (DeepSeek caches repeated prompt prefixes automatically).
- Default model is `deepseek-chat`. Override with `DEEPSEEK_MODEL`.

## Adding Cambodia (Khmer)

The learner-language selector already offers Khmer (beta): every AI output that has an `_l1` field comes back in Khmer, and the Indonesian glosses in the interface are hidden. To finish the Cambodia version:
1. Add Khmer UI glosses (the `Bi` component in `src/components/lang.tsx` and labels in `src/lib/design-thinking.ts`).
2. Add a Khmer version of the course Markdown (for example `content/course/km/`) with local challenge areas and the errors Khmer speakers commonly make in English.

## Project structure

```
content/course/        Curriculum (Markdown)
src/app/               Pages + API routes (/api/coach, /api/brief, /api/lab)
src/components/        UI pieces
src/lib/               AI client, prompts, schemas, design-thinking stages, storage
```
