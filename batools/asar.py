"""Asar archive helpers."""

import os

from batools.command import CommandUtils


class AsarUtils:
    @staticmethod
    def extract_asar(asar_path: str, dest_dir: str) -> bool:
        """
        将 asar 文件解压到指定目录
        """
        if not os.path.exists(dest_dir):
            os.makedirs(dest_dir)

        success, error = CommandUtils.run_command("asar", "extract", asar_path, dest_dir)
        if not success:
            print(f"解压 ASAR 失败: {error}")
        return success

    @staticmethod
    def pack_asar(src_dir: str, asar_path: str) -> bool:
        """
        将指定目录打包回 asar 文件
        """
        parent_dir = os.path.dirname(asar_path)
        if parent_dir and not os.path.exists(parent_dir):
            os.makedirs(parent_dir)

        success, error = CommandUtils.run_command("asar", "pack", src_dir, asar_path)
        if not success:
            print(f"打包 ASAR 失败: {error}")
        return success
