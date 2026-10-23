#!/usr/bin/env python3
"""
Turn messy prerequisite text into rules with Gemini, for the courses the scraper flagged.

Usage (from the repo root, after scripts/scrape_bulletin.py):
    python scripts/ai_prereqs.py                  # every flagged course
    python scripts/ai_prereqs.py --only COMS      # one subject, for testing
    python scripts/ai_prereqs.py --limit 40       # first 40 flagged courses

Needs GOOGLE_GENERATIVE_AI_API_KEY (from the environment or .env.local).

For each flagged course it asks for:
  prereqs      AND of OR-groups of course codes, like the scraper's
  coreqs       same, for corequisites (can be taken in the same semester)
  conditions   things that aren't courses: "instructor's permission", "junior standing", ...
  confidence   high / medium / low

Every code the model returns is checked against the real catalog; unknown codes are dropped
and recorded. Results go to data/catalog/prereqs-ai.json and are marked as AI-made in the app
until someone checks them (put the checked rule in overrides.json). Answers are cached in
scripts/.cache/ai, so re-running only asks about new or changed text.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CATALOG = ROOT / "data" / "catalog"
OUT = CATALOG / "prereqs-ai.json"
CACHE = HERE / ".cache" / "ai"
PROMPT_VERSION = 1
BATCH = 20

sys.path.insert(0, str(HERE))
from scrape_bulletin import number_key, offered_codes  # noqa: E402

INSTRUCTIONS = """You convert Columbia University course prerequisite text into structured rules.

For each course, return:
- prereqs: a list of groups. Every group must be satisfied (AND); a group is satisfied by any one course in it (OR).
  "(A or B) and C" -> [["A","B"],["C"]]. "A, B, or C" -> [["A","B","C"]]. No prerequisites -> [].
- coreqs: the same shape, for corequisites (courses that may be taken in the same semester). Empty if none.
- conditions: short plain phrases for requirements that are not courses, e.g. "instructor's permission",
  "junior standing", "placement exam", "or equivalent", "knowledge of C". Empty if none.
- confidence: "high" if the text is unambiguous, "medium" if you made a reasonable reading, "low" if unsure.

Rules:
- Write course codes as SUBJ PREFIXNUMBER, e.g. "COMS W3134", "MATH UN1201". When a code omits the subject
  ("W3157" after "COMS W3134"), use the subject of the nearest code before it.
- Only use course codes that appear in the text. Never invent codes.
- "Recommended" or "suggested" courses are not prerequisites: put them in conditions as "recommended: CODE".
- "X or the instructor's permission" means the course is still listed, and "instructor's permission" goes in conditions.
- "or equivalent" goes in conditions; keep the listed courses.
- Return one result per input course, with the same code.
"""

SCHEMA = {
    "type": "ARRAY",
    "items": {
        "type": "OBJECT",
        "properties": {
            "code": {"type": "STRING"},
            "prereqs": {"type": "ARRAY", "items": {"type": "ARRAY", "items": {"type": "STRING"}}},
            "coreqs": {"type": "ARRAY", "items": {"type": "ARRAY", "items": {"type": "STRING"}}},
            "conditions": {"type": "ARRAY", "items": {"type": "STRING"}},
            "confidence": {"type": "STRING", "enum": ["high", "medium", "low"]},
        },
        "required": ["code", "prereqs", "coreqs", "conditions", "confidence"],
    },
}


# ---------------------------------------------------------------------------
# Catalog lookups
# ---------------------------------------------------------------------------

def known_codes() -> set[str]:
    """Every course code the app knows: bulletin, Directory of Classes, hand-entered rows."""
    codes = set(offered_codes())
    bulletin = CATALOG / "bulletin.json"
    if bulletin.exists():
        codes |= {c["code"] for c in json.loads(bulletin.read_text(encoding="utf-8"))}
    hand = ROOT / "data" / "courses.ts"
    if hand.exists():
        codes |= set(re.findall(r'\["([A-Z]{4} [A-Z]{0,2}\d{4})"', hand.read_text(encoding="utf-8")))
    return codes


class Resolver:
    """Maps a code the model wrote to a catalog code: exact, else the only one with the same subject + number."""

    def __init__(self, codes: set[str]):
        self.codes = codes
        self.by_key: dict[str, list[str]] = {}
        for c in codes:
            self.by_key.setdefault(number_key(c), []).append(c)

    def __call__(self, code: str) -> str | None:
        code = re.sub(r"\s+", " ", code.strip().upper())
        if not re.fullmatch(r"[A-Z]{4} [A-Z]{0,2}\d{4}", code):
            return None
        if code in self.codes:
            return code
        same = self.by_key.get(number_key(code), [])
        return same[0] if len(same) == 1 else None


def clean_groups(groups, resolve: Resolver, dropped: list[str]) -> list[list[str]]:
    out = []
    for g in groups or []:
        resolved = []
        for code in g or []:
            r = resolve(str(code))
            if r is None:
                dropped.append(str(code))
            elif r not in resolved:
                resolved.append(r)
        if resolved and resolved not in out:
            out.append(resolved)
    return out


def validate(raw: dict, resolve: Resolver) -> dict:
    """Keep only real course codes; record what was dropped."""
    dropped: list[str] = []
    result = {
        "prereqs": clean_groups(raw.get("prereqs"), resolve, dropped),
        "coreqs": clean_groups(raw.get("coreqs"), resolve, dropped),
        "conditions": [str(c).strip() for c in raw.get("conditions") or [] if str(c).strip()],
        "confidence": raw.get("confidence") if raw.get("confidence") in ("high", "medium", "low") else "low",
    }
    if dropped:
        result["droppedCodes"] = sorted(set(dropped))
        if result["confidence"] == "high":
            result["confidence"] = "medium"
    return result


# ---------------------------------------------------------------------------
# Gemini
# ---------------------------------------------------------------------------

def api_key() -> str:
    key = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY")
    env = ROOT / ".env.local"
    if not key and env.exists():
        m = re.search(r"^GOOGLE_GENERATIVE_AI_API_KEY\s*=\s*(\S+)", env.read_text(encoding="utf-8"), re.M)
        key = m.group(1).strip("\"'") if m else None
    if not key:
        sys.exit("Set GOOGLE_GENERATIVE_AI_API_KEY (or put it in .env.local). Free key: https://aistudio.google.com/apikey")
    return key


def build_prompt(batch: list[dict]) -> str:
    items = [
        {"code": c["code"], "prerequisites": c.get("prereqText", ""), "corequisites": c.get("coreqText", "")}
        for c in batch
    ]
    return INSTRUCTIONS + "\nCourses:\n" + json.dumps(items, ensure_ascii=False, indent=1)


def call_gemini(prompt: str, model: str, key: str) -> list[dict]:
    import requests

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json", "responseSchema": SCHEMA},
    }
    for attempt in range(6):
        res = requests.post(url, json=body, headers={"x-goog-api-key": key}, timeout=120)
        if res.status_code == 429 or res.status_code >= 500:
            wait = int(res.headers.get("Retry-After", 0)) or min(60, 10 * (attempt + 1))
            print(f"  rate limited or busy ({res.status_code}); waiting {wait}s")
            time.sleep(wait)
            continue
        res.raise_for_status()
        text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    raise RuntimeError("Gemini kept refusing; try again later or lower the batch size")


def cache_key(course: dict, model: str) -> str:
    raw = json.dumps([PROMPT_VERSION, model, course["code"], course.get("prereqText", ""), course.get("coreqText", "")])
    return hashlib.sha1(raw.encode()).hexdigest()[:20]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run(courses: list[dict], model: str, ask=None, pause: float = 4.0) -> dict[str, dict]:
    """Returns {code: validated result}. `ask(prompt) -> list` is injectable for tests."""
    CACHE.mkdir(parents=True, exist_ok=True)
    resolve = Resolver(known_codes() | {c["code"] for c in courses})
    if ask is None:
        key = api_key()
        ask = lambda prompt: call_gemini(prompt, model, key)  # noqa: E731

    results: dict[str, dict] = {}
    todo = []
    for c in courses:
        hit = CACHE / f"{cache_key(c, model)}.json"
        if hit.exists():
            results[c["code"]] = validate(json.loads(hit.read_text(encoding="utf-8")), resolve)
        else:
            todo.append(c)
    print(f"{len(courses)} flagged courses: {len(courses) - len(todo)} cached, {len(todo)} to ask about")

    for i in range(0, len(todo), BATCH):
        batch = todo[i : i + BATCH]
        answers = {a.get("code", "").upper(): a for a in ask(build_prompt(batch)) if isinstance(a, dict)}
        for c in batch:
            raw = answers.get(c["code"])
            if raw is None:
                print(f"  ! no answer for {c['code']}")
                continue
            (CACHE / f"{cache_key(c, model)}.json").write_text(json.dumps(raw), encoding="utf-8")
            results[c["code"]] = validate(raw, resolve)
        print(f"  {min(i + BATCH, len(todo))}/{len(todo)}")
        if i + BATCH < len(todo):
            time.sleep(pause)  # stay under free-tier rate limits
    return results


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", help="subject code, e.g. COMS")
    ap.add_argument("--limit", type=int, help="at most this many courses")
    ap.add_argument("--model", default="gemini-2.5-flash")
    ap.add_argument("--pause", type=float, default=4.0, help="seconds between requests")
    args = ap.parse_args(argv)

    bulletin = CATALOG / "bulletin.json"
    if not bulletin.exists():
        sys.exit("Run scripts/scrape_bulletin.py first.")
    courses = [
        c for c in json.loads(bulletin.read_text(encoding="utf-8"))
        if c.get("needsReview") and (c.get("prereqText") or c.get("coreqText"))
        and (not args.only or c["dept"] == args.only.upper())
    ]
    if args.limit:
        courses = courses[: args.limit]

    results = run(courses, args.model, pause=args.pause)

    existing = json.loads(OUT.read_text(encoding="utf-8")).get("courses", {}) if OUT.exists() else {}
    existing.update(results)
    OUT.write_text(json.dumps({
        "_readme": "Made by scripts/ai_prereqs.py from bulletin prerequisite text. Not checked by a person: "
                   "put checked rules in overrides.json. Regenerate instead of editing by hand.",
        "model": args.model,
        "courses": dict(sorted(existing.items())),
    }, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")

    low = sum(1 for r in results.values() if r["confidence"] == "low")
    dropped = sum(1 for r in results.values() if r.get("droppedCodes"))
    print(f"wrote {len(results)} results to {OUT.relative_to(ROOT)}: {low} low confidence, {dropped} mentioned codes we don't know")
    return 0


if __name__ == "__main__":
    sys.exit(main())
