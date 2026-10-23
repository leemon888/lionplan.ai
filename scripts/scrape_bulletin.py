#!/usr/bin/env python3
"""
Scrape course listings from the Columbia Bulletin into data/catalog/*.json.

Usage (from the repo root):
    pip install -r scripts/requirements.txt
    python scripts/scrape_bulletin.py            # scrape everything in SOURCES
    python scripts/scrape_bulletin.py --offline  # re-parse cached pages, no network

Each output file is a JSON list of courses:
    {code, title, points, dept, level, description, prereqText, coreqText,
     prereqs: [["COMS W3134", "COMS W3137"], ...],   # AND of OR-groups
     tags, needsReview, reviewReason, source}

`needsReview` marks prerequisites the parser couldn't turn into clean rules
("instructor's permission", "or equivalent", ...). Check those by hand.
Pages are cached in scripts/.cache so you can re-run parsing without re-downloading.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "catalog"
CACHE_DIR = Path(__file__).resolve().parent / ".cache"
BASE = "https://bulletin.columbia.edu"
HEADERS = {"User-Agent": "Lionplan course planner (student project; contact cl4371@columbia.edu)"}

# Which pages to read, and which courses to keep from each.
#   subjects: keep every course whose subject code is in this set
#   codes:    keep only these exact course codes (for cognates from other departments)
SOURCES: dict[str, list[dict]] = {
    # Everything on the CS page: COMS plus joint courses (CSEE, CSOR, CBMF, ECBM, EECS...).
    "coms": [
        {
            "url": f"{BASE}/columbia-college/departments-instruction/computer-science/",
            "subjects": {"COMS", "CSEE", "CSOR", "CBMF", "ECBM", "EECS", "CSPH", "CSEN"},
        },
    ],
    # Courses from other departments that the CS major requires or accepts.
    "cs-cognates": [
        {
            "url": f"{BASE}/columbia-college/departments-instruction/mathematics/",
            "codes": {"MATH UN1101", "MATH UN1102", "MATH UN1201", "MATH UN1202", "MATH UN1205",
                      "MATH UN1207", "MATH UN1208", "MATH UN2010", "MATH UN2015", "MATH UN2020"},
        },
        {
            "url": f"{BASE}/columbia-college/departments-instruction/statistics/",
            "codes": {"STAT UN1201", "STAT GU4001"},
        },
        {
            "url": f"{BASE}/columbia-engineering/academic-departments-programs/applied-physics-applied-mathematics/",
            "codes": {"APMA E2000", "APMA E2101", "APMA E3101"},
        },
        {
            "url": f"{BASE}/columbia-engineering/academic-departments-programs/industrial-engineering-operations-research/",
            "codes": {"IEOR E3658"},
        },
    ],
}

CODE_RE = re.compile(r"\b([A-Z]{4})\s+([A-Z]{1,2}\d{4}|\d{4})\b")
BARE_NUM_RE = re.compile(r"\b([A-Z]{1,2}\d{4})\b")
REVIEW_WORDS = re.compile(
    r"instructor|permission|equivalent|consent|recommended|background|knowledge|experience|"
    r"approval|standing|placement|score|grade|concurrent|familiarity|at least",
    re.I,
)


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------

def fetch(url: str, offline: bool) -> str:
    CACHE_DIR.mkdir(exist_ok=True)
    path = CACHE_DIR / (hashlib.sha1(url.encode()).hexdigest()[:16] + ".html")
    if path.exists() and (offline or time.time() - path.stat().st_mtime < 24 * 3600):
        return path.read_text(encoding="utf-8")
    if offline:
        raise RuntimeError(f"No cached copy of {url}; run once without --offline")
    import requests

    print(f"  downloading {url}")
    res = requests.get(url, headers=HEADERS, timeout=30)
    res.raise_for_status()
    path.write_text(res.text, encoding="utf-8")
    time.sleep(1.0)  # be polite
    return res.text


# ---------------------------------------------------------------------------
# Parsing a page
# ---------------------------------------------------------------------------

SMALL_WORDS = {"and", "or", "of", "the", "in", "for", "to", "a", "an", "with", "on", "at", "by", "via"}
KEEP_UPPER = {"I", "II", "III", "IV", "V", "AI", "ML", "NLP", "UI", "OS", "CS", "TA", "GPU", "VLSI", "RISC", "SQL", "HCI", "AR", "VR", "IOT", "DNA", "RNA"}


def smart_title(s: str) -> str:
    """'DATA STRUCTURES IN JAVA' -> 'Data Structures in Java'. Leaves mixed-case titles alone."""
    s = s.strip().rstrip(".").strip()
    if s != s.upper():
        return s
    words = s.split()
    out = []
    for i, w in enumerate(words):
        core = re.sub(r"[^A-Za-z]", "", w)
        if core in KEEP_UPPER:
            out.append(w)
        elif i > 0 and core.lower() in SMALL_WORDS:
            out.append(w.lower())
        else:
            out.append(w[:1] + w[1:].lower())
    return " ".join(out)


def normalize_code(dept: str, num: str) -> str:
    return f"{dept} {num}"


def parse_points(text: str) -> tuple[float, str]:
    m = re.search(r"(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*(?:points?|pts)", text, re.I)
    if not m:
        return 0, ""
    low = float(m.group(1))
    return (int(low) if low.is_integer() else low), m.group(0)


def parse_page(html: str, source_url: str) -> list[dict]:
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    courses = []
    for block in soup.select(".courseblock"):
        title_el = block.select_one(".courseblocktitle")
        if not title_el:
            continue
        title_text = re.sub(r"\s+", " ", title_el.get_text(" ", strip=True).replace("\xa0", " "))
        m = re.match(r"([A-Z]{4})\s+([A-Z]{1,2}\d{4}|\d{4})\s*[.:]?\s*(.+)$", title_text)
        if not m:
            continue
        code = normalize_code(m.group(1), m.group(2))
        rest = m.group(3)
        points, points_text = parse_points(rest)
        if points_text:
            rest = rest.replace(points_text, "")
        title = smart_title(re.sub(r"\s*\.\s*$", "", rest).strip(" .")) or code

        body_parts = []
        # Leaf paragraphs only (spans inside them would repeat their text).
        for el in block.find_all(["p", "div"], recursive=True):
            if el is title_el or title_el in el.parents or el.find(["p", "div"]):
                continue
            text = re.sub(r"\s+", " ", el.get_text(" ", strip=True).replace("\xa0", " "))
            if text and text not in body_parts:
                body_parts.append(text)
        body = " ".join(body_parts)
        if not points:
            points, _ = parse_points(body)

        # Sort paragraphs: prerequisite / corequisite clauses vs. the description itself.
        prereq_text, coreq_text, desc_parts = "", "", []
        for part in body_parts:
            clauses = split_clauses(part)
            if clauses is None:
                if not re.match(r"^(Lect|Lab|Rec)\s*:|^(CC|GS|SEAS|BC)(/\w+)*\s*:", part):
                    desc_parts.append(part)
                continue
            prereq_text = prereq_text or clauses.get("pre", "")
            coreq_text = coreq_text or clauses.get("co", "")
        description = re.sub(r"\s+", " ", " ".join(desc_parts)).strip()[:1200]
        prereqs, review_reason = parse_prereqs(prereq_text)

        tags = []
        if re.search(r"Science Requirement", body, re.I):
            tags.append("science_req")
        if re.search(r"Global Core", body, re.I):
            tags.append("global_core")

        dept = m.group(1)
        num = re.sub(r"\D", "", m.group(2))
        courses.append({
            "code": code,
            "title": title,
            "points": points,
            "dept": dept,
            "level": int(num[0]) * 1000 if num else 0,
            "description": description,
            "prereqText": prereq_text,
            "coreqText": coreq_text,
            "prereqs": prereqs,
            "tags": tags,
            "needsReview": bool(review_reason),
            "reviewReason": review_reason,
            "source": source_url,
        })
    return courses


def split_clauses(text: str) -> dict | None:
    """'Prerequisites: X Corequisites: Y' -> {'pre': 'X', 'co': 'Y'}; None if the text has neither."""
    parts = re.split(r"(Prerequisites?|Corequisites?)\s*:", text, flags=re.I)
    if len(parts) < 3:
        return None
    out = {}
    for label, value in zip(parts[1::2], parts[2::2]):
        key = "pre" if label.lower().startswith("pre") else "co"
        out.setdefault(key, value.strip().rstrip(".").strip())
    return out


# ---------------------------------------------------------------------------
# Prerequisites: text -> AND of OR-groups
# ---------------------------------------------------------------------------

def tokenize(text: str) -> list[tuple[str, str]]:
    """Tokens: ('CODE', 'COMS W3134'), ('AND', ''), ('OR', ''), ('(', ''), (')', ''), ('WORD', ...)"""
    tokens: list[tuple[str, str]] = []
    last_dept = None
    i = 0
    pattern = re.compile(
        r"\s*(?:(?P<code>[A-Z]{4}\s+(?:[A-Z]{1,2}\d{4}|\d{4}))\b|(?P<bare>[A-Z]{1,2}\d{4})\b|(?P<lp>\()|(?P<rp>\))"
        r"|(?P<and>(?i:\band\b)|;|&)|(?P<or>(?i:\bor\b)|/)|(?P<comma>,)|(?P<word>[^\s(),;/]+))"
    )
    while i < len(text):
        m = pattern.match(text, i)
        if not m or m.end() == i:
            break
        i = m.end()
        if m.group("code"):
            dept, num = m.group("code").split()
            last_dept = dept.upper()
            tokens.append(("CODE", normalize_code(last_dept, num.upper())))
        elif m.group("bare"):
            if last_dept:
                tokens.append(("CODE", normalize_code(last_dept, m.group("bare").upper())))
            else:
                tokens.append(("WORD", m.group("bare")))
        elif m.group("lp"):
            tokens.append(("(", ""))
        elif m.group("rp"):
            tokens.append((")", ""))
        elif m.group("and"):
            tokens.append(("AND", ""))
        elif m.group("or"):
            tokens.append(("OR", ""))
        elif m.group("comma"):
            tokens.append((",", ""))
        else:
            tokens.append(("WORD", m.group("word")))
    return tokens


def to_cnf(node) -> list[frozenset]:
    """node: ('code', x) | ('and', [..]) | ('or', [..]) -> list of OR-clauses."""
    kind = node[0]
    if kind == "code":
        return [frozenset([node[1]])]
    if kind == "and":
        out: list[frozenset] = []
        for child in node[1]:
            out.extend(to_cnf(child))
        return out
    # or: distribute
    clauses = [frozenset()]
    for child in node[1]:
        child_cnf = to_cnf(child)
        clauses = [a | b for a in clauses for b in child_cnf]
    return clauses


def parse_prereqs(text: str) -> tuple[list[list[str]], str]:
    """
    Returns (groups, review_reason). groups is AND-of-OR: [["A","B"],["C"]] = (A or B) and C.
    review_reason is "" when the text was fully understood.
    """
    if not text:
        return [], ""
    reasons = []
    if REVIEW_WORDS.search(text):
        reasons.append("mentions something besides courses")
    tokens = tokenize(text)
    if any(t[0] == "WORD" and not re.fullmatch(r"the|either|both|of|following|courses?|is|are|required|in|a|an|one", t[1], re.I) for t in tokens):
        if not reasons:
            reasons.append("has words the parser ignored")
    codes_only = [t for t in tokens if t[0] != "WORD"]

    pos = 0

    def peek():
        return codes_only[pos][0] if pos < len(codes_only) else None

    def parse_expr():
        nonlocal pos
        items = [parse_term()]
        ops = []
        while peek() in ("AND", "OR", ","):
            op = codes_only[pos][0]
            pos += 1
            if peek() in (None, ")", "AND", "OR", ","):
                continue
            ops.append(op)
            items.append(parse_term())
        items = [x for x in items if x is not None]
        if not items:
            return None
        if len(items) == 1:
            return items[0]
        real_ops = {"AND" if o in ("AND",) else "OR" if o == "OR" else "," for o in ops}
        # Commas take the meaning of the explicit operator around them ("A, B, or C"); default AND.
        if "," in real_ops:
            explicit = real_ops - {","}
            if len(explicit) > 1:
                reasons.append("mixes and/or without parentheses")
            kind = "or" if explicit == {"OR"} else "and"
            return (kind, items)
        if len(real_ops) > 1:
            reasons.append("mixes and/or without parentheses")
            # Read "A or B and C" as "(A or B) and C", the usual intent.
            groups, cur = [], [items[0]]
            for op, item in zip(ops, items[1:]):
                if op == "OR":
                    cur.append(item)
                else:
                    groups.append(("or", cur) if len(cur) > 1 else cur[0])
                    cur = [item]
            groups.append(("or", cur) if len(cur) > 1 else cur[0])
            return ("and", groups)
        return ("and" if real_ops == {"AND"} else "or", items)

    def parse_term():
        nonlocal pos
        kind = peek()
        if kind == "CODE":
            pos += 1
            return ("code", codes_only[pos - 1][1])
        if kind == "(":
            pos += 1
            inner = parse_expr()
            if peek() == ")":
                pos += 1
            return inner
        if kind is not None and kind not in ("AND", "OR", ",", ")"):
            pos += 1
        elif kind == ")":
            pos += 1
        return None

    tree = None
    while pos < len(codes_only):
        start = pos
        part = parse_expr()
        if part is not None:
            tree = part if tree is None else ("and", [tree, part])
        if pos == start:
            pos += 1

    if tree is None:
        return [], "; ".join(reasons) or "no course codes found"
    clauses = to_cnf(tree)
    # Drop duplicate and subsumed clauses, keep a stable order.
    unique: list[frozenset] = []
    for c in clauses:
        if c and not any(u <= c for u in unique):
            unique = [u for u in unique if not c <= u] + [c]
    order = [t[1] for t in tokens if t[0] == "CODE"]
    groups = [sorted(c, key=order.index) for c in unique]
    return groups, "; ".join(dict.fromkeys(reasons))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def scrape(name: str, sources: list[dict], offline: bool) -> list[dict]:
    found: dict[str, dict] = {}
    for src in sources:
        html = fetch(src["url"], offline)
        for c in parse_page(html, src["url"]):
            keep = c["code"] in src["codes"] if "codes" in src else c["dept"] in src["subjects"]
            if keep and c["code"] not in found:
                found[c["code"]] = c
        if "codes" in src:
            missing = sorted(set(src["codes"]) - set(found))
            if missing:
                print(f"  ! not found on {src['url']}: {', '.join(missing)}")
    return sorted(found.values(), key=lambda c: (c["dept"], c["code"]))


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--offline", action="store_true", help="only use cached pages")
    ap.add_argument("--only", choices=sorted(SOURCES), help="scrape one output file")
    args = ap.parse_args(argv)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, sources in SOURCES.items():
        if args.only and name != args.only:
            continue
        print(f"{name}:")
        courses = scrape(name, sources, args.offline)
        if not courses:
            print("  ! no courses parsed; the page layout may have changed. Nothing written.")
            continue
        path = OUT_DIR / f"{name}.json"
        path.write_text(json.dumps(courses, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        review = sum(c["needsReview"] for c in courses)
        print(f"  wrote {len(courses)} courses to {path.relative_to(ROOT)} ({review} need a prereq check)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
