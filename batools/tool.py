"""External CLI tool downloader/manager."""

import os
import stat
import platform
import shutil

from typing import Tuple

from batools.archive import ZipUtils
from batools.downloader import FileDownloader


class ToolManager:
    def __init__(self, install_dir: str):
        self.install_dir = install_dir
        self.binary_name = "BlueArchiveTools.CLI"

    @classmethod
    def get_platform_identifier(cls) -> Tuple[str, str]:
        os_map = {
            "linux": "linux",
            "darwin": "osx",
            "windows": "win"
        }
        arch_map = {
            "x86_64": "x64",
            "amd64": "x64",
            "arm64": "arm64",
            "aarch64": "arm64"
        }

        os_name = os_map.get(platform.system().lower())
        arch = arch_map.get(platform.machine().lower())

        if not os_name or not arch:
            raise RuntimeError(f"Unsupported OS or architecture: {platform.system()} {platform.machine()}")

        return f"{os_name}-{arch}", os_name

    def ensure_tool(self) -> str:
        platform_id, os_name = self.get_platform_identifier()

        if not os.path.exists(self.install_dir):
            os.makedirs(self.install_dir, exist_ok=True)
            zip_url = f"https://github.com/BlueArchive-Translation/BlueArchive-Tools-CLI/releases/latest/download/BlueArchiveTools.{platform_id}.zip"
            zip_path = os.path.join(self.install_dir, "tools.zip")

            FileDownloader(zip_url).save_file(zip_path)
            ZipUtils.extract_zip(zip_path, self.install_dir)
            os.remove(zip_path)

            # 解压后搜索实际二进制文件（zip包可能包含顶层目录）
            found = self._find_binary(self.install_dir)
            if found:
                # 如果二进制文件不在 install_dir 根目录，将其移动过来
                expected = os.path.abspath(os.path.join(self.install_dir, self.binary_name))
                if found != expected:
                    shutil.move(found, expected)

        binary_path = os.path.abspath(os.path.join(self.install_dir, self.binary_name))
        if not os.path.exists(binary_path):
            # 若仍不存在，执行全目录搜索兜底
            found = self._find_binary(self.install_dir)
            if not found:
                raise FileNotFoundError(
                    f"无法在 {self.install_dir} 中找到 {self.binary_name}，"
                    f"请检查工具是否已正确下载。"
                )
            # 将找到的二进制文件链接/移动到预期位置
            shutil.move(found, binary_path)

        if os_name != "win":
            if not os.access(binary_path, os.X_OK):
                st = os.stat(binary_path)
                os.chmod(binary_path, st.st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
        return binary_path

    def _find_binary(self, search_dir: str) -> str | None:
        """在解压目录中递归搜索二进制文件。"""
        for root, dirs, files in os.walk(search_dir):
            for f in files:
                if f == self.binary_name:
                    return os.path.join(root, f)
            # 跨平台支持：Windows 上可能是 BlueArchiveTools.CLI.exe
            for f in files:
                if f == f"{self.binary_name}.exe":
                    return os.path.join(root, f)
        return None
