# Week 3 — Prototype: Building with AI

*Minggu 3 — Prototipe: Membangun dengan AI*

| | |
|---|---|
| **Design thinking stage** | Prototype |
| **English focus** | Imperatives, sequencing (*first, then, after that, finally*), purpose (*so that, in order to*), conditionals (*If…, then…*), describing features |
| **Prompting focus** | Step-by-step instructions, few-shot examples, constraints, "ask me questions first", system prompts, prompt chains, iteration |
| **Socratic focus** | Implications — *"What happens if the user types something unexpected?"* |
| **App** | Prompt Lab (Advanced option) · Project Studio → *Prototype* canvas · Portfolio |
| **Output** | Working prototype v1 + prompt log (at least 6 prompts) |

## Learning outcomes

By the end of this week, students can:

- Give clear, ordered instructions in English using imperatives and sequencing words
- Write rules for an AI using *must / must not / always / never / if…then*
- Improve a prompt by adding an example (few-shot), constraints, or step-by-step instructions
- Break a big task into a chain of smaller prompts
- Build a working prototype and document every important prompt

## What can students build? (no coding needed)

| Prototype type | How | Example |
|---|---|---|
| **Custom chatbot** | A reusable system prompt pasted at the start of a DeepSeek chat (or a custom GPT / a Gem) | *"Warung Bu Sri" assistant that answers menu and delivery questions* |
| **Mini web app** | Ask DeepSeek to write a single-file HTML page, save it as `index.html`, and open it in a browser | *Vocabulary quiz for SMP students about local animals* |
| **Content kit** | A prompt chain that produces a set of materials | *10 Instagram posts + captions + hashtag plan for a homestay* |
| **Guide or handbook** | Research → outline → write → check | *Bilingual guide to sorting waste for a kos-kosan* |
| **Workflow** | A reusable prompt template others can fill in | *CV-to-cover-letter template for vocational graduates* |

## Key vocabulary

| English | Bahasa Indonesia | Example |
|---|---|---|
| prototype | prototipe / versi awal | *Our prototype is a simple chatbot.* |
| feature | fitur | *The main feature is the menu search.* |
| step | langkah | *Step 1: Ask the customer's name.* |
| instruction | instruksi | *Give clear instructions.* |
| example | contoh | *Here is an example of a good answer.* |
| system prompt | prompt sistem | *The system prompt tells the chatbot how to behave.* |
| iterate | mengulang & memperbaiki | *We iterated on the prompt five times.* |
| bug | kesalahan / galat | *We found a bug: it answers in English only.* |
| edge case | kasus tak biasa | *Edge case: the customer asks about a dish that isn't on the menu.* |
| chain | rangkaian | *We used a chain of three prompts.* |

## Language focus

### 1. Imperatives and sequencing

> ***First**, read the customer's message. **Then** check if the item is on the menu. **If** it is, give the price. **If** it isn't, suggest a similar item. **Finally**, ask if they want to order.*

Imperatives use the base verb: *Read · Check · Give · Suggest · Ask · Do not…*

### 2. Rules: must, must not, always, never

- *You **must** answer in Bahasa Indonesia unless the customer writes in English.*
- *You **must not** invent prices.*
- ***Always** end with a question. **Never** use more than 80 words.*

### 3. Purpose: so that / in order to

- *Keep answers short **so that** customers can read them on their phones.*
- *Ask for the address **in order to** calculate delivery cost.*

### 4. Conditionals (If…, then…)

*If the user asks something outside the menu, **(then)** politely say you can only help with orders.*

## Prompt techniques this week

| Technique | What it is | Example line |
|---|---|---|
| **Step-by-step** | Number the steps you want | *Follow these steps: 1) … 2) … 3) …* |
| **Few-shot** | Show 1–3 examples of a good output | *Here is an example of the style I want: …* |
| **Constraints** | Limits on length, language, content | *Maximum 3 sentences. No emoji.* |
| **Ask first** | Let the AI ask before answering | *Before you start, ask me 3 questions about my audience.* |
| **System prompt** | Permanent instructions for a chatbot | *You are the assistant for… Your job is… Rules: …* |
| **Prompt chain** | One prompt's output feeds the next | *Prompt 1: outline → Prompt 2: write section 1 → Prompt 3: check* |
| **Self-check** | Ask the AI to review its own work | *After writing, check that every price matches the menu.* |

## Session plans

### Session 1 (2 h): Plan the build

| Time | Activity |
|---|---|
| 15 min | Warm-up: *"Give me instructions"* — one student gives step-by-step English instructions to draw a simple picture; partner draws without looking. Discuss: what made instructions clear? |
| 25 min | **Language focus:** imperatives, sequencing, must/never, if…then. |
| 30 min | Fill in the **Prototype canvas**: AI's job, 3 features max, tools, build steps. Coach asks *implications* questions (*"What happens if a user asks something your bot doesn't know?"*). |
| 40 min | **First build prompt.** Teams draft in Indonesian → Prompt Lab (task: *Build*) → read the **Advanced** option carefully. Answer the clarifying questions and **Refine**. Run the result in the AI tool. |
| 10 min | Save to Portfolio. Reflection: *"The first result was… We need to change…"* |

### Session 2 (2 h): Build sprint & iteration

| Time | Activity |
|---|---|
| 10 min | Mini-lesson: **few-shot examples** — before/after demo. |
| 70 min | **Build sprint.** Teams iterate. Rule: every time the output is wrong, **diagnose in English before changing the prompt**: *"The output is too long because we didn't give a word limit."* Teacher circulates with Socratic questions. |
| 25 min | **Edge-case testing in pairs:** Team A tries to "break" Team B's prototype with unusual inputs; Team B writes down each bug in English. |
| 15 min | Log at least 3 prompt versions in the Portfolio with reflections. |

### Session 3 (2 h): Prompt chains & prototype v1

| Time | Activity |
|---|---|
| 20 min | Mini-lesson: **prompt chains**. Example: research → outline → draft → check. Teams map their own chain on paper. |
| 60 min | Finish **prototype v1**. Teams that finish early add one feature or improve a weak prompt with the Advanced techniques. |
| 25 min | **Two-minute demos** in small groups: *"Our prototype does… First you… Then it…"* |
| 15 min | Update the Prototype canvas; plan who will test it in Week 4. |

## Homework

1. Finish prototype v1. It must work end to end for one real use case.
2. Portfolio: at least **6 prompts** total, including your **system prompt** or main build prompt and at least **two versions** of the same prompt showing how you improved it.
3. Book **3 real users** to test your prototype in Week 4.

## Deliverable checklist

- [ ] Prototype canvas complete
- [ ] Working prototype v1 (link, screenshots or file)
- [ ] 6+ prompts in the Portfolio, with version history and reflections
- [ ] Bug list (in English) from edge-case testing
- [ ] Testers booked

## Teacher notes

- **Diagnose before you fix.** The most valuable English practice this week is students *explaining what went wrong* — not copying a new prompt. Insist on the sentence: *"The output was ___ because ___, so we changed ___."*
- Students will be tempted to copy the Advanced option without reading it. Ask them to **delete one line and explain why** it wasn't needed, or to **replace every [square bracket]** with real project details.
- **Data privacy:** remind students not to paste personal data (phone numbers, ID numbers, real customer names) into AI tools.
