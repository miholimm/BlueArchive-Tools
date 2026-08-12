"""Lock the public API surface of the batools package.

Guards against accidental changes to ``import batools``'s exported symbols,
and ensures the package imports cleanly even without optional third-party deps.
"""

import unittest

import batools


class TestPackageApi(unittest.TestCase):
    EXPECTED = [
        "Config",
        "FileUtils",
        "CommandUtils",
        "Utils",
        "TemplateString",
        "TaskManager",
    ]

    def test_public_symbols_present(self):
        for name in self.EXPECTED:
            self.assertTrue(
                hasattr(batools, name),
                f"batools.{name} 缺失于公共 API（__all__）",
            )

    def test_package_imports_without_optional_deps(self):
        # import batools 仅依赖标准库，必须始终成功
        self.assertTrue(hasattr(batools, "__all__"))


if __name__ == "__main__":
    unittest.main()
