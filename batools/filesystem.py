"""Filesystem helpers."""

import os
import re


class FileUtils:
    @staticmethod
    def find_files(
        directory: str,
        keywords: list[str],
        absolute_match: bool = False,
        sequential_match: bool = False,
    ) -> list[str]:
        """Retrieve files from a given directory based on specified keywords of file name.

        Args:
            directory (str): The directory to search for files.
            keywords (list[str]): A list of keywords to match file names.
            absolute_match (bool, optional): If True, matches file names exactly with the keywords. If False, performs a partial match (i.e., checks if any keyword is a substring of the file name). Defaults to False.
            sequential_match (bool, optional): If True, the final list will be matched sequentially based on the order of the provided keywords. If a keyword has multiple values, only one will be retained. A keyword that no result to be retrieved will correspond to a None value. Defaults to False.
        Returns:
            list[str]: A list of file paths that match the specified criteria.
        """
        paths = []

        compiled_patterns = []
        for k in keywords:
            try:
                compiled_patterns.append(re.compile(k))
            except re.error:
                compiled_patterns.append(re.compile(re.escape(k)))

        for dir_path, _, files in os.walk(directory):
            for file in files:
                if absolute_match:
                    if any(pattern.fullmatch(file) for pattern in compiled_patterns):
                        paths.append(os.path.join(dir_path, file))
                else:
                    if any(pattern.search(file) for pattern in compiled_patterns):
                        paths.append(os.path.join(dir_path, file))

        if not sequential_match:
            return paths

        sorted_paths = []
        # Sequential match part.
        for pattern in compiled_patterns:
            for p in paths:
                file_name = os.path.basename(p)
                if (absolute_match and pattern.fullmatch(file_name)) or (not absolute_match and pattern.search(file_name)):
                    sorted_paths.append(p)
                    break

        return sorted_paths
