"""Tests for batools.concurrency (stdlib only)."""

import unittest

from batools.concurrency import TaskManager, TemplateString, Utils


class TestTemplateString(unittest.TestCase):
    def test_formatting(self):
        t = TemplateString("What%s a %s %s.")
        self.assertEqual(t("", "fast", "fox"), "What a fast fox.")

    def test_empty_template(self):
        t = TemplateString("")
        self.assertEqual(t(), "")


class TestUtils(unittest.TestCase):
    def test_empty_name(self):
        self.assertEqual(Utils.convert_name_to_available(""), "_")

    def test_leading_digit(self):
        self.assertEqual(Utils.convert_name_to_available("123abc"), "_123abc")

    def test_keyword(self):
        self.assertEqual(Utils.convert_name_to_available("class"), "class_")

    def test_normal(self):
        self.assertEqual(Utils.convert_name_to_available("normal_name"), "normal_name")


class TestTaskManager(unittest.TestCase):
    def test_construction(self):
        tm = TaskManager(4, 8, lambda *a: None)
        self.assertEqual(tm.target_workers, 4)
        self.assertEqual(tm.max_workers, 8)

    def test_import_tasks(self):
        tm = TaskManager(1, 1, lambda *a: None)
        tm.import_tasks([1, 2, 3])
        self.assertEqual(tm.tasks.qsize(), 3)

    def test_increase_worker(self):
        tm = TaskManager(1, 1, lambda *a: None)
        tm.increase_worker(2)
        self.assertEqual(tm.target_workers, 3)


if __name__ == "__main__":
    unittest.main()
