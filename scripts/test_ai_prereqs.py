"""Tests for the AI prerequisite step, with a fake model (no network). Run: python -m unittest discover scripts"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import ai_prereqs  # noqa: E402
from ai_prereqs import Resolver, build_prompt, run, validate  # noqa: E402

CODES = {"COMS W3134", "COMS W3137", "COMS W3157", "CSEE W3827", "CSOR E4231", "BIOL BC3320", "BIOL UN3320"}


class Validate(unittest.TestCase):
    def setUp(self):
        self.resolve = Resolver(CODES)

    def test_keeps_real_codes_and_normalizes(self):
        r = validate({"prereqs": [["coms w3134", "COMS  W3137"], ["CSEE W3827"]], "coreqs": [], "conditions": ["instructor's permission"], "confidence": "high"}, self.resolve)
        self.assertEqual(r["prereqs"], [["COMS W3134", "COMS W3137"], ["CSEE W3827"]])
        self.assertEqual(r["conditions"], ["instructor's permission"])
        self.assertEqual(r["confidence"], "high")

    def test_matches_other_prefix_only_when_unambiguous(self):
        r = validate({"prereqs": [["CSOR W4231"], ["BIOL W3320"]], "coreqs": [], "conditions": [], "confidence": "high"}, self.resolve)
        self.assertEqual(r["prereqs"], [["CSOR E4231"]])
        self.assertEqual(r["droppedCodes"], ["BIOL W3320"])

    def test_invented_codes_are_dropped_and_lower_confidence(self):
        r = validate({"prereqs": [["COMS W9999"], ["COMS W3157"]], "coreqs": [], "conditions": [], "confidence": "high"}, self.resolve)
        self.assertEqual(r["prereqs"], [["COMS W3157"]])
        self.assertEqual(r["droppedCodes"], ["COMS W9999"])
        self.assertEqual(r["confidence"], "medium")

    def test_bad_confidence_becomes_low(self):
        self.assertEqual(validate({"prereqs": [], "coreqs": [], "conditions": [], "confidence": "sure"}, self.resolve)["confidence"], "low")


class Run(unittest.TestCase):
    def test_batches_caches_and_validates(self):
        courses = [
            {"code": "COMS W4118", "prereqText": "(CSEE W3827) and knowledge of C as covered in COMS W3157, or the instructor's permission"},
            {"code": "COMS W3157", "prereqText": "COMS W3134 or COMS W3137, or equivalent"},
        ]
        prompts = []

        def fake_model(prompt):
            prompts.append(prompt)
            return [
                {"code": "COMS W4118", "prereqs": [["CSEE W3827"], ["COMS W3157"]], "coreqs": [], "conditions": ["instructor's permission"], "confidence": "medium"},
                {"code": "COMS W3157", "prereqs": [["COMS W3134", "COMS W3137"]], "coreqs": [], "conditions": ["or equivalent"], "confidence": "high"},
            ]

        with tempfile.TemporaryDirectory() as d:
            old_cache, old_known = ai_prereqs.CACHE, ai_prereqs.known_codes
            ai_prereqs.CACHE = Path(d)
            ai_prereqs.known_codes = lambda: CODES
            try:
                first = run(courses, "test-model", ask=fake_model, pause=0)
                second = run(courses, "test-model", ask=lambda p: self.fail("should use the cache"), pause=0)
            finally:
                ai_prereqs.CACHE, ai_prereqs.known_codes = old_cache, old_known

        self.assertEqual(len(prompts), 1)
        self.assertIn("COMS W4118", prompts[0])
        self.assertEqual(first, second)
        self.assertEqual(first["COMS W4118"]["prereqs"], [["CSEE W3827"], ["COMS W3157"]])
        self.assertEqual(first["COMS W3157"]["conditions"], ["or equivalent"])

    def test_prompt_lists_every_course(self):
        p = build_prompt([{"code": "A", "prereqText": "x"}, {"code": "B", "coreqText": "y"}])
        items = json.loads(p.split("Courses:\n", 1)[1])
        self.assertEqual([i["code"] for i in items], ["A", "B"])


if __name__ == "__main__":
    unittest.main()
