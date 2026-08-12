"""Tests for batools.command.CommandUtils.run_command (stdlib only)."""

import os
import sys
import tempfile
import unittest

from batools.command import CommandUtils


class TestRunCommand(unittest.TestCase):
    def test_success_captures_stdout(self):
        ok, out = CommandUtils.run_command(
            sys.executable, "-c", "print('hello')"
        )
        self.assertTrue(ok)
        self.assertEqual(out, "hello")

    def test_failure_returns_false(self):
        ok, err = CommandUtils.run_command(
            sys.executable, "-c", "import sys; sys.exit(3)"
        )
        self.assertFalse(ok)
        self.assertIn("3", err)

    def test_nonexistent_command(self):
        ok, err = CommandUtils.run_command(
            "this_command_should_not_exist_xyz_12345"
        )
        self.assertFalse(ok)
        self.assertTrue(err)  # Some error description is returned

    def test_cwd_is_respected(self):
        tmpd = tempfile.mkdtemp()
        ok, out = CommandUtils.run_command(
            sys.executable, "-c", "import os; print(os.getcwd())", cwd=tmpd
        )
        self.assertTrue(ok)
        self.assertEqual(os.path.normcase(out), os.path.normcase(tmpd))


if __name__ == "__main__":
    unittest.main()
