"""Lock the centralized path constants.

Guards against accidental value changes when editing ``batools/paths.py`` —
the whole point of centralizing is that these strings must keep matching the
original CWD-relative paths the rest of the code (and CI) expects.
"""

import unittest

from batools import paths


class TestPaths(unittest.TestCase):
    def test_directory_constants_match_original_literals(self):
        self.assertEqual(paths.OTHER_DIR, "other")
        self.assertEqual(paths.DOWNLOAD_DIR, "Download")
        self.assertEqual(paths.TEMP_DIR, "Temp")
        self.assertEqual(paths.VOICE_DIR, "Voice")
        self.assertEqual(paths.TOOLS_DIR, "tools")
        self.assertEqual(paths.EXTRACTED_DIR, "Extracted")
        self.assertEqual(paths.DUMPS_DIR, "Dumps")
        self.assertEqual(paths.REPLACE_DIR, "Replace")
        self.assertEqual(paths.TABLE_BUNDLES_DIR, "BA-TableBundles")
        self.assertEqual(paths.FLAT_DATA_MODULE, "FlatData")

    def test_composed_paths(self):
        self.assertEqual(f"{paths.OTHER_DIR}/voice.json", "other/voice.json")
        self.assertEqual(f"{paths.OTHER_DIR}/BA_JP.env", "other/BA_JP.env")
        self.assertEqual(
            f"{paths.DOWNLOAD_DIR}/MediaCatalog.json",
            "Download/MediaCatalog.json",
        )


if __name__ == "__main__":
    unittest.main()
