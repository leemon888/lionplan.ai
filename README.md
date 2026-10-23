# Lionplan

An AI course planner for Columbia students. A one-question-at-a-time onboarding builds a plan, then students edit it by
dragging courses or just asking the assistant ("swap my 9am for a stats class", "am I on track?").

**Pages:** This semester and Next semester (weekly calendars), Four-year plan (grid plus requirements). The assistant
lives in a panel that keeps its conversation across pages and can sit in the corner, dock to the bottom third, or go
full screen. Course suggestions arrive as cards you can add, mark as already taken, or drag onto a semester or the
calendar. Light, dark and system themes.

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
data/sections.ts     meeting times for the calendars (SAMPLE until real sections are loaded)
data/programs.ts     requirements as small rules: course, allOf, anyOf, choose N, points, manual
lib/engine.ts        deterministic checker: requirement status, prereq/overload warnings, points
lib/plan-ops.ts      the only way to change a plan: addCourse, moveCourse, removeCourse, setManual, updateProfile
lib/store.ts         client state (zustand, saved to localStorage) with undo
lib/tools.ts         the AI's plan-editing tools (same ops as above, run in the browser)
lib/ai-context.ts    system instructions: student profile + plan + engine output
app/api/chat         Gemini via the Vercel AI SDK, plus server tools (search_courses, get_course)
lib/onboarding.ts    turns messy onboarding answers ("cc", "soph", "calc 1, lit hum") into profile data
lib/dnd.ts           drag and drop between chat cards, calendars and the four-year grid
app/page.tsx         onboarding
app/(app)/this-semester | next-semester | plan
```

Why it's built this way:

- **The AI never decides if a requirement is met.** `lib/engine.ts` does, and the AI reads its output. That keeps
  answers correct even when the model is wrong.
- **The AI only uses real course codes.** It searches the catalog with a tool, and `addCourse` rejects anything
  not in it.
- **One set of edit rules.** Drag-and-drop and AI tool calls both go through `lib/plan-ops.ts`, and every change
  can be undone.

## Course data: scraping the bulletin

Course data comes from the Columbia Bulletin through `scripts/scrape_bulletin.py`. Right now it scrapes
**Computer Science**: every course on the CS page (COMS plus joint CSEE, CSOR, CBMF... courses) and the math and
statistics courses the CS major requires from other departments.

Run it on your laptop (Python 3.10+). From the repo root:

```bash
pip install -r scripts/requirements.txt
python scripts/scrape_bulletin.py          # writes data/catalog/coms.json and cs-cognates.json
python -m unittest discover scripts        # scraper tests
npm test                                   # app tests, including the catalog
```

How the catalog is built (`data/courses.ts`), later layers winning:
1. hand-entered starter rows (Core, Econ, Math, Stats not scraped yet)
2. the Directory of Classes (`data/directory.generated.ts`, `npm run import:doc`): every course offered this year,
   which semesters, Barnard, and last published times. Fills in courses nobody has scraped yet, with short titles.
3. scraped files in `data/catalog/*.json`, regenerated whenever you re-run the scraper
4. hand fixes in `data/catalog/overrides.json`, which the scraper never touches

The same course can be written with different prefixes (`CSOR E4231` / `CSOR W4231`). Layers match on the exact
code, then on subject + number when only one course has it (Barnard's `BIOL BC3320` and `BIOL UN3320` are different
courses).

Checking prerequisites: the scraper turns "Prerequisites: (COMS W3134) or (COMS W3137)" into rules. When the text says
something it can't turn into rules ("or the instructor's permission", "knowledge of C"), the course gets
`"needsReview": true` with a `reviewReason`. Look those up, then put the correct rule in `overrides.json`:

```json
"COMS W4118": { "prereqs": [["CSEE W3827"], ["COMS W3136", "COMS W3157"]], "needsReview": false, "reviewed": true }
```

To add a department, add an entry to `SOURCES` at the top of the scraper.

## Data status (read before launch)

`npm run import:doc` pulls every undergraduate-facing course offered this fall or next spring from the public
Directory of Classes (doc.sis.columbia.edu) into `data/directory.generated.ts`, with each course's last published
time (Fall 2024 / Spring 2025). Change `OFFERED_TERMS` in `scripts/import-doc.ts` each semester and re-run.
Hand-entered courses in `data/courses.ts` keep their prereqs and tags; imported ones fill in the rest.

The catalog and requirements are **hand-entered starter data**. Each program links its source in `sourceUrl`.
Before launch, someone needs to check every rule and course against the bulletin, and fill in:

- real meeting times: the Directory of Classes stopped publishing them after Spring 2025 (they're only in Vergil,
  behind a UNI login), so `data/sections.ts` uses each course's last published time and labels it. Ask the
  Registrar/CUIT for a data feed of current times.
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
