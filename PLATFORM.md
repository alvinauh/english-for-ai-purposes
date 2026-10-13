# CODESWITCH

**Think in your language. Prompt in English.**

CODESWITCH is the platform behind the *English for AI Building* course. Indonesian and Myanmar students learn English, design thinking and prompt engineering by building a real project with AI. They start in their own language: an AI tutor turns their rough idea into a strong English prompt, step by step, until they can write it on their own. Every message is saved to the student's account. Teachers get a dashboard, in English, Bahasa Indonesia or Burmese, that shows each student's *prompt chain*: what they wrote, how the tutor replied and how their CRAFT score grew over time.

> *Code-switching* is moving between two languages in one conversation, which is what these students do between Burmese or Indonesian and English. It's also the switch from talking about an idea to writing a prompt a machine can act on.

---

## What it does

| For students | For teachers |
|---|---|
| Sign up with a class code from the teacher, then log in on any device | Create classes and get a 6-letter join code for each one |
| **Prompt Lab**: a 4-stage chat with the AI tutor (Share idea → Answer & think → Write your own → Polish & test) | See every student with their chat count, messages, own attempts, CRAFT score (first → latest, best), stage reached and last active date |
| Write in Bahasa Indonesia, Burmese (Zawgyi or Unicode) or English; get glosses and replies in their own language | Filter the class by learner language (Indonesian / Myanmar / Khmer) |
| Chats save to their account automatically, with a local copy so a weak connection doesn't lose work | Open a student to see each chat as a prompt chain: the student's original text, the tutor's reply (switch between the student's language and English), feedback, English upgrades and CRAFT boxes |
| Download a chat as .md, .json or PDF, or all chats as .csv/.json | A bar chart of each student's CRAFT score over time |
| Light, dark or auto theme | Export the whole class as one CSV (UTF-8, opens in Excel with Burmese text intact) |
| | Set a new password for a student who forgot theirs |
| | Dashboard interface in **English, Bahasa Indonesia or Burmese** |

**Admins** are teachers with extra powers, on `/admin`:
- Generate **one-time teacher sign-up codes**, add a note saying who each one is for, see who used it, and cancel unused codes.
- **How everyone is doing:** platform totals (teachers, students, students active this week, chats) and one row per class showing teacher, students, active students, chats, own attempts, average CRAFT score (first → latest) and last activity. **Open →** goes to that class in the teacher dashboard.
- In the teacher dashboard, admins see every teacher's classes, students and prompt chains, not just their own.

Also in the course: **Course** (4 weeks of lessons plus assessment), **Project Studio** (design-thinking canvas with a Socratic coach and project brief) and **Portfolio**.

## How it works

- **Stack:** Next.js 16 + Tailwind 4, DeepSeek (`deepseek-chat`, JSON mode) for the tutor, and SQLite through Node 22's built-in `node:sqlite`, so there are no extra packages or database server.
- **Database:** one file, `data/app.db` (gitignored; move it with `DATABASE_PATH`). Tables: `users` (with an `is_admin` flag), `classes`, `sessions`, `chats`, `invite_codes`. Each chat is stored as JSON, with title, language, task and dates copied into columns for sorting.
- **Accounts:** username + password. No email, because many students don't have one they check. Passwords are hashed with scrypt. Sessions use a random token in an httpOnly cookie, stored only as a SHA-256 hash, and last 60 days.
  - Students need a valid **class code** to sign up.
  - Teachers need a **one-time code** that an admin generates on `/admin`. Each code works for one account.
  - Admin accounts are created on the server with `scripts/create-admin.mjs`, which can also make an existing account an admin or reset its password:
    `ADMIN_USERNAME=... ADMIN_PASSWORD=... ADMIN_NAME="..." node scripts/create-admin.mjs`
- **Saving:** the Prompt Lab keeps a per-user cache in the browser and saves each changed chat to `/api/chats/:id` about 0.6 s after it changes. If the connection drops, it retries every 15 s. On first login, chats saved in that browser before accounts existed are uploaded to the account once. Logging out clears that user's cache, which matters on shared lab computers.
- **Access rules:** the AI endpoints (`/api/lab`, `/api/coach`, `/api/brief`) need a login, so the DeepSeek key can't be used anonymously. A student can only read and write their own chats. A teacher can only see classes they created and the students in them. An admin can see all of them.

### API

| Route | Who | What |
|---|---|---|
| `POST /api/auth/signup` · `login` · `logout`, `GET /api/auth/me` | anyone | accounts and session |
| `GET /api/chats`, `POST /api/chats` (bulk) | logged in | list or save own chats |
| `PUT` / `DELETE /api/chats/:id` | owner | save or delete one chat (older copies never overwrite newer ones) |
| `GET` / `POST /api/teacher/classes` | teacher | list or create classes |
| `GET /api/teacher/students?classId=` | teacher | class roster with stats |
| `GET` / `POST /api/teacher/students/:id` | teacher | full chats / reset password |
| `GET /api/teacher/export?classId=` | teacher | class CSV |
| `GET` / `POST` / `DELETE /api/admin/invites` | admin | list, generate or cancel teacher sign-up codes |
| `GET /api/admin/overview` | admin | totals and per-class progress across the platform |

### Setup

```bash
# .env.local
DEEPSEEK_API_KEY=...
# COOKIE_SECURE=1         # turn on once the site is on https

npm run build && npx next start -p 3010
```

Create an admin with `scripts/create-admin.mjs`, log in, generate teacher codes on `/admin`, and give them to teachers. Each teacher creates a class at `/teacher` and gives students its join code.

## Still to do

- **Burmese wording review:** a native speaker should check the Burmese UI text, including the new login page and dashboard strings, which Claude wrote.
- **HTTPS:** the server runs on plain http at port 3010. Put it behind https (Caddy/nginx), then set `COOKIE_SECURE=1`.
- **Login rate limiting:** there's no limit on failed logins yet. Add one before the site is public.
- **Backups:** back up `data/app.db` (for example a nightly `sqlite3 data/app.db ".backup ..."`).
- **Live sync:** a chat open on two devices at once syncs on page load, not live.
- **Khmer:** UI glosses and course content are still beta.
