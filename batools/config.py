"""Global configuration constants for batools.

These are process-wide, mutable class attributes (e.g. ``Config.server`` is
overwritten per-run by the CLI entry points). They intentionally live in a tiny,
dependency-free module so every other module can import them without pulling in
third-party packages.
"""

from typing import ClassVar

from batools.paths import OTHER_DIR


class Config:
    threads: ClassVar[int] = 32
    max_threads: ClassVar[int] = threads * 7
    server: ClassVar[str] = "JP"
    proxy: ClassVar[str | None] = None
    retries: ClassVar[int] = 5
    db_password: ClassVar[str] = ""
    VOICE_JSON_PATH: ClassVar[str] = f"{OTHER_DIR}/voice.json"
    ENV_FILE_PATH: ClassVar[str] = f"{OTHER_DIR}/BA_{server}.env"
