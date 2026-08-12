"""Tests for batools.filesystem.FileUtils.find_files (stdlib only)."""

import os
import shutil
import tempfile
import unittest

from batools.filesystem import FileUtils


class TestFindFiles(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.sub = os.path.join(self.root, "sub")
        os.makedirs(self.sub)
        # root/a.txt, root/data_csv.json, sub/c.txt, sub/nested.json
        self.files = {
            "a.txt": os.path.join(self.root, "a.txt"),
            "data_csv.json": os.path.join(self.root, "data_csv.json"),
            "c.txt": os.path.join(self.sub, "c.txt"),
            "nested.json": os.path.join(self.sub, "nested.json"),
        }
        for path in self.files.values():
            with open(path, "w", encoding="utf-8") as f:
                f.write("x")

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_partial_match(self):
        res = FileUtils.find_files(self.root, ["txt"])
        names = sorted(os.path.basename(p) for p in res)
        self.assertEqual(names, ["a.txt", "c.txt"])

    def test_absolute_match(self):
        res = FileUtils.find_files(self.root, ["a.txt"], absolute_match=True)
        self.assertEqual(len(res), 1)
        self.assertEqual(os.path.basename(res[0]), "a.txt")

    def test_absolute_match_requires_full_name(self):
        # "txt" is not a full filename, so absolute match yields nothing.
        res = FileUtils.find_files(self.root, ["txt"], absolute_match=True)
        self.assertEqual(res, [])

    def test_regex_keyword(self):
        res = FileUtils.find_files(self.root, [r".*\.json$"])
        names = sorted(os.path.basename(p) for p in res)
        self.assertEqual(names, ["data_csv.json", "nested.json"])

    def test_sequential_match_preserves_keyword_order(self):
        res = FileUtils.find_files(
            self.root, ["c.txt", "a.txt"], sequential_match=True
        )
        names = [os.path.basename(p) for p in res]
        self.assertEqual(names, ["c.txt", "a.txt"])

    def test_literal_keyword_escaped(self):
        # A keyword with regex metacharacters should be treated literally.
        res = FileUtils.find_files(self.root, ["a.txt"])
        self.assertTrue(any(os.path.basename(p) == "a.txt" for p in res))
        self.assertFalse(any("json" in os.path.basename(p) for p in res))


if __name__ == "__main__":
    unittest.main()
