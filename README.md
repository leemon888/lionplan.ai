# Lionplan

An AI course planner for Columbia College. Students tell it where they are, get a four-year plan, and edit it by
dragging courses or just asking the assistant ("swap my 9am for a stats class", "am I on track?").

v1 scope: **Columbia College only**, majors **Economics, Mathematics, Computer Science**, plus the Core.

## Run it

```bash
npm install
cp .env.example .env.local   # paste a free Gemini key from https://aistudio.google.com/apikey
npm run dev                  # http://localhost:3000
npm test                     # requirements engine tests
```

Everything except the chat works without a key.

## How it fits together

The one idea to keep in mind: **the plan is a single object, and both the UI and the AI edit it through the same
functions.**

```
data/courses.ts      catalog (code, title, points, prereqs, tags)
data/programs.ts     requirements as small rules: course, allOf, anyOf, choose N, points, manual
lib/engine.ts        deterministic checker: requirement status, prereq/overload warnings, points
lib/plan-ops.ts      the only way to change a plan: addCourse, moveCourse, removeCourse, setManual, updateProfile
lib/store.ts         client state (zustand, saved to localStorage) with undo
lib/tools.ts         the AI's plan-editing tools (same ops as above, run in the browser)
lib/ai-context.ts    system instructions: student profile + plan + engine output
app/api/chat         Gemini via the Vercel AI SDK, plus server tools (search_courses, get_course)
app/page.tsx         onboarding
app/(app)/plan | requirements | explore
```

Why it's built this way:

- **The AI never decides if a requirement is met.** `lib/engine.ts` does, and the AI reads its output. That keeps
  answers correct even when the model is wrong.
- **The AI only uses real course codes.** It searches the catalog with a tool, and `addCourse` rejects anything
  not in it.
- **One set of edit rules.** Drag-and-drop and AI tool calls both go through `lib/plan-ops.ts`, and every change
  can be undone.

## Data status (read before launch)

The catalog and requirements are **hand-entered starter data**. Each program links its source in `sourceUrl`.
Before launch, someone needs to check every rule and course against the bulletin, and fill in:

- more courses (full ECON, MATH, COMS, STAT listings; Core sections)
- the approved Science and Global Core lists (currently manual checkboxes)
- CS tracks (only the shared major requirements are encoded)
- rules not enforced yet: "at most one 2000-level econ elective", MATH UN2015 counting twice for CS

Last year's repo (`leemon888/lionplan`) has scrapers for the bulletin, the Directory of Classes and CULPA that show
where this data lives.

## Plan for the first 5 days

| Day | Goal |
|---|---|
| 1 | Get running locally, add Gemini key, try the full flow. Agree on look and copy. |
| 2 | Data: expand the catalog for the three majors; verify every requirement rule against the bulletin. |
| 3 | AI: test onboarding with real transcripts, tune `lib/ai-context.ts`, fix tool-call edge cases. |
| 4 | Accounts (Supabase, Columbia Google login), cloud saving, shareable plan link. Deploy to Vercel. |
| 5 | Test with 5–10 students, fix what breaks, launch. |

Cut from v1: CULPA ratings, PDF export, multiple plans, weekly calendar, SEAS/Barnard/GS.

## Working together

Branch per feature (`name/feature`), open a PR, the other person reviews. Run `npm test` and `npm run build`
before pushing. When you change requirement data, add a test case in `lib/engine.test.ts`.

## Open block prototype (Alina's draft)

`index.html`, `app.js`, `agent.js`, `data.js` and `styles.css` at the repo root are a separate plain-JS prototype:
a single-semester weekly calendar with natural-language course search ("light CS elective, no Fridays") and an
assistant. It uses made-up sample data. Open `index.html` in a browser, or run `python3 -m http.server 8000`.

It covers the "next semester / weekly schedule" view that the four-year planner doesn't have yet. A good next step
is to port it into the Next.js app as a page that reads the same catalog and plan.
