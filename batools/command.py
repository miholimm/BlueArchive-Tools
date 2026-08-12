"""Shell command helpers."""

import subprocess


class CommandUtils:
    @staticmethod
    def run_command(
        *commands: str,
        cwd: str | None = None,
        capture_output: bool = True
    ) -> tuple[bool, str]:
        """
        Executes a shell command and returns whether it succeeded.
        Args:
            *commands (str): Command and its arguments as separate strings.
        Returns:
            tuple (bool, str): True if the command succeeded (returns stdout), False otherwise (returns error string).
        """
        try:
            result = subprocess.run(
                list(commands),
                check=True,
                text=True,
                cwd=cwd,
                encoding="utf8",
                capture_output=capture_output # 增加捕获输出以兼容依赖返回值的脚本
            )
            return True, result.stdout.strip() if capture_output else ""
        except Exception as e:
            return False, str(e)
