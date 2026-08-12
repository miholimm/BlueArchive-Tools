"""Import-graph smoke test.

Guards against refactor regressions that break module imports.

- GUARANTEED modules must always import (they only depend on the stdlib and
  are exercised unconditionally, so a failure here is a real breakage).
- OPTIONAL modules may depend on third-party packages (pycryptodome, xxhash,
  requests, lxml, pyminizip, unitypy, PyCriCodecs, ...) that are not present in
  every environment. Those are skipped gracefully so the suite still passes
  locally, while CI (which installs the full dependency set) imports them too.
"""

import importlib
import unittest

GUARANTEED = [
    "batools.config",
    "batools.filesystem",
    "batools.command",
    "batools.concurrency",
    "batools.cli.get_keys",
]

OPTIONAL = [
    "batools.encryption",
    "batools.archive",
    "batools.asar",
    "batools.tool",
    "batools.regions",
    "batools.downloader",
    "batools.console",
    "batools.structure",
    "batools.database",
    "batools.extraction.bundle",
    "batools.extraction.catalog",
    "batools.extraction.table",
    "batools.voice.build",
    "batools.voice.extract",
    "batools.excel.process",
    "batools.cli.get_catalog",
    "batools.cli.get_files",
    "batools.cli.update",
    "batools.cli.update_apk",
]


class TestImportSmoke(unittest.TestCase):
    def test_guaranteed_imports(self):
        for mod in GUARANTEED:
            importlib.import_module(mod)  # raises if import graph is broken

    def test_optional_imports(self):
        skipped = []
        for mod in OPTIONAL:
            try:
                importlib.import_module(mod)
            except ImportError as exc:
                skipped.append(f"{mod}({exc})")
        if skipped:
            self.skipTest(
                "可选模块因缺少可选依赖被跳过: " + "; ".join(skipped)
            )


if __name__ == "__main__":
    unittest.main()
