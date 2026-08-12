"""Tests for batools.config (pure class attributes, no third-party deps)."""

import unittest

from batools.config import Config


class TestConfig(unittest.TestCase):
    def test_defaults_present(self):
        self.assertEqual(Config.threads, 32)
        self.assertEqual(Config.max_threads, Config.threads * 7)
        self.assertEqual(Config.server, "JP")
        self.assertIsNone(Config.proxy)
        self.assertEqual(Config.retries, 5)
        self.assertEqual(Config.db_password, "")
        self.assertEqual(Config.VOICE_JSON_PATH, "other/voice.json")

    def test_env_file_path_uses_server(self):
        # ENV_FILE_PATH is derived from the class-level `server` default.
        self.assertEqual(Config.ENV_FILE_PATH, "other/BA_JP.env")

    def test_mutable_class_attribute(self):
        original = Config.server
        try:
            Config.server = "CN"
            self.assertEqual(Config.server, "CN")
        finally:
            Config.server = original


if __name__ == "__main__":
    unittest.main()
