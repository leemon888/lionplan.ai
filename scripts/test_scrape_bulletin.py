"""Tests for the bulletin scraper. Run from the repo root: python -m unittest discover scripts"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import json  # noqa: E402
import tempfile  # noqa: E402

import scrape_bulletin  # noqa: E402
from scrape_bulletin import discover_links, keep_relevant, parse_page, parse_prereqs, smart_title, write_outputs  # noqa: E402

# Shaped like the bulletin's CourseLeaf markup.
PAGE = """
<div class="sc_sccoursedescs">
  <div class="courseblock">
    <p class="courseblocktitle"><strong>COMS W3134 Data Structures in Java. </strong><em>3 points</em></p>
    <p class="courseblockdesc">Data types and structures: arrays, stacks, singly and doubly linked lists, queues, trees, sets, and graphs. Taught in Java.</p>
    <p class="courseblockextra"><span>Prerequisites: (COMS W1004) or COMS W1004; Knowledge of Java</span></p>
  </div>
  <div class="courseblock">
    <p class="courseblocktitle"><strong>COMS W3157 ADVANCED PROGRAMMING.</strong> <em>4.00 points</em>.</p>
    <p class="courseblockextra">Lect: 4.</p>
    <p class="courseblockextra">Prerequisites: (COMS W3134) or (COMS W3137)</p>
    <p class="courseblockdesc">C programming language and Unix systems programming.</p>
  </div>
  <div class="courseblock">
    <p class="courseblocktitle"><strong>COMS W3261 COMPUTER SCIENCE THEORY.</strong> <em>3.00 points</em>.</p>
    <p class="courseblockextra">CC/GS: Partial Fulfillment of Science Requirement.</p>
    <p class="courseblockextra">Prerequisites: (COMS W3203) Corequisites: COMS W3134, COMS W3136, COMS W3137</p>
    <p class="courseblockdesc">Regular languages: deterministic and non-deterministic finite automata.</p>
  </div>
  <div class="courseblock">
    <p class="courseblocktitle"><strong>COMS W4118 OPERATING SYSTEMS I.</strong> <em>3.00 points</em>.</p>
    <p class="courseblockextra">Prerequisites: (CSEE W3827) and knowledge of C and programming tools as covered in COMS W3136, W3157, or W3101, or the instructor's permission.</p>
    <p class="courseblockdesc">Design and implementation of operating systems.</p>
  </div>
  <div class="courseblock">
    <p class="courseblocktitle"><strong>MATH UN2010 LINEAR ALGEBRA.</strong> <em>3 points</em>.</p>
    <p class="courseblockextra">Prerequisites: MATH UN1201 or the equivalent.</p>
    <p class="courseblockdesc">Matrices, vector spaces, linear transformations.</p>
  </div>
  <div class="courseblock"><p class="courseblocktitle"><strong>Not a course</strong></p></div>
</div>
"""


class ParsePage(unittest.TestCase):
    def setUp(self):
        self.courses = {c["code"]: c for c in parse_page(PAGE, "https://example/cs")}

    def test_reads_every_course(self):
        self.assertEqual(sorted(self.courses), ["COMS W3134", "COMS W3157", "COMS W3261", "COMS W4118", "MATH UN2010"])

    def test_titles_and_points(self):
        self.assertEqual(self.courses["COMS W3157"]["title"], "Advanced Programming")
        self.assertEqual(self.courses["COMS W3157"]["points"], 4)
        self.assertEqual(self.courses["COMS W3134"]["title"], "Data Structures in Java")
        self.assertEqual(self.courses["COMS W4118"]["title"], "Operating Systems I")
        self.assertEqual(self.courses["COMS W3134"]["level"], 3000)

    def test_prereqs(self):
        self.assertEqual(self.courses["COMS W3157"]["prereqs"], [["COMS W3134", "COMS W3137"]])
        self.assertFalse(self.courses["COMS W3157"]["needsReview"])
        self.assertEqual(self.courses["COMS W3261"]["prereqs"], [["COMS W3203"]])
        self.assertEqual(self.courses["COMS W3261"]["coreqText"], "COMS W3134, COMS W3136, COMS W3137")

    def test_flags_prereqs_that_need_a_human(self):
        c = self.courses["COMS W3134"]
        self.assertEqual(c["prereqs"], [["COMS W1004"]])
        self.assertTrue(c["needsReview"])
        self.assertTrue(self.courses["MATH UN2010"]["needsReview"])
        self.assertTrue(self.courses["COMS W4118"]["needsReview"])

    def test_description_excludes_prereqs(self):
        d = self.courses["COMS W3157"]["description"]
        self.assertIn("Unix systems programming", d)
        self.assertNotIn("Prerequisites", d)
        self.assertNotIn("Lect", d)

    def test_tags(self):
        self.assertIn("science_req", self.courses["COMS W3261"]["tags"])


class ParsePrereqs(unittest.TestCase):
    def test_or(self):
        self.assertEqual(parse_prereqs("(COMS W3134) or (COMS W3137)"), ([["COMS W3134", "COMS W3137"]], ""))

    def test_and_of_ors(self):
        groups, why = parse_prereqs("(COMS W3203) and (COMS W3134 or COMS W3137)")
        self.assertEqual(groups, [["COMS W3203"], ["COMS W3134", "COMS W3137"]])
        self.assertEqual(why, "")

    def test_codes_inherit_department(self):
        groups, _ = parse_prereqs("COMS W3134, W3136, or W3137")
        self.assertEqual(groups, [["COMS W3134", "COMS W3136", "COMS W3137"]])

    def test_or_of_ands_is_distributed(self):
        groups, _ = parse_prereqs("(MATH UN1101 and MATH UN1102) or MATH UN1207")
        self.assertEqual(groups, [["MATH UN1101", "MATH UN1207"], ["MATH UN1102", "MATH UN1207"]])

    def test_semicolon_is_and(self):
        groups, _ = parse_prereqs("COMS W3157; CSEE W3827")
        self.assertEqual(groups, [["COMS W3157"], ["CSEE W3827"]])

    def test_ambiguous_mix_is_flagged(self):
        groups, why = parse_prereqs("COMS W3134 or COMS W3137 and CSEE W3827")
        self.assertEqual(groups, [["COMS W3134", "COMS W3137"], ["CSEE W3827"]])
        self.assertIn("mixes", why)

    def test_empty(self):
        self.assertEqual(parse_prereqs(""), ([], ""))
        self.assertEqual(parse_prereqs("Instructor's permission")[0], [])


class Coreqs(unittest.TestCase):
    def test_coreq_comma_list_means_any_one(self):
        c = {c["code"]: c for c in parse_page(PAGE, "x")}["COMS W3261"]
        self.assertEqual(c["coreqs"], [["COMS W3134", "COMS W3136", "COMS W3137"]])

    def test_prereq_comma_list_is_flagged(self):
        groups, why = parse_prereqs("COMS W3134, COMS W3157")
        self.assertEqual(groups, [["COMS W3134"], ["COMS W3157"]])
        self.assertIn("comma list", why)


INDEX = """
<a href="/columbia-college/departments-instruction/computer-science/">CS</a>
<a href="/columbia-college/departments-instruction/computer-science/#coursestext">CS courses</a>
<a href="/columbia-college/departments-instruction/computer-science/courses/">deeper</a>
<a href="/columbia-college/departments-instruction/computer-science/a/b/c/">too deep</a>
<a href="/columbia-college/departments-instruction/search/">search</a>
<a href="/columbia-college/departments-instruction/x.pdf">pdf</a>
<a href="https://example.com/columbia-college/departments-instruction/evil/">offsite</a>
<a href="/general-studies/whatever/">other school</a>
<a href="economics/">relative</a>
"""


class Crawl(unittest.TestCase):
    def test_discover_links(self):
        index = "/columbia-college/departments-instruction/"
        links = discover_links(INDEX, index, index, 2)
        self.assertEqual(links, [
            "/columbia-college/departments-instruction/computer-science/",
            "/columbia-college/departments-instruction/computer-science/courses/",
            "/columbia-college/departments-instruction/economics/",
        ])

    def test_keep_relevant_follows_prereqs_down(self):
        def course(code, prereqs=()):
            return {"code": code, "prereqs": [list(p) for p in prereqs], "coreqs": []}
        found = {
            "COMS W4118": course("COMS W4118", [["COMS W3157"]]),
            "COMS W3157": course("COMS W3157", [["COMS W3134"]]),
            "COMS W3134": course("COMS W3134"),
            "COMS W4999": course("COMS W4999"),
            "CSOR W4231": course("CSOR W4231"),
        }
        kept = [c["code"] for c in keep_relevant(found, {"COMS W4118", "CSOR E4231"})]
        self.assertEqual(kept, ["COMS W3134", "COMS W3157", "COMS W4118", "CSOR W4231"])

    def test_write_outputs_keeps_descriptions_out_of_the_browser_file(self):
        with tempfile.TemporaryDirectory() as d:
            old = scrape_bulletin.OUT_DIR
            scrape_bulletin.OUT_DIR = scrape_bulletin.Path(d)
            try:
                write_outputs(parse_page(PAGE, "https://example/cs"))
                compact = json.loads((scrape_bulletin.Path(d) / "bulletin.json").read_text())
                details = json.loads((scrape_bulletin.Path(d) / "bulletin-details.json").read_text())
            finally:
                scrape_bulletin.OUT_DIR = old
        self.assertNotIn("description", compact[0])
        self.assertIn("Unix systems programming", details["COMS W3157"]["description"])
        self.assertEqual(next(c for c in compact if c["code"] == "COMS W3157")["prereqs"], [["COMS W3134", "COMS W3137"]])


class Titles(unittest.TestCase):
    def test_smart_title(self):
        self.assertEqual(smart_title("INTRO TO DATABASES."), "Intro to Databases")
        self.assertEqual(smart_title("TOPICS IN AI AND ML"), "Topics in AI and ML")
        self.assertEqual(smart_title("Already Mixed Case"), "Already Mixed Case")


if __name__ == "__main__":
    unittest.main()
