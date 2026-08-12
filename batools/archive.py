"""Archive (zip) helpers."""

import os
import struct
import zlib
import pyminizip

from zipfile import ZipFile, ZIP_DEFLATED

from batools.console import ProgressBar, notice
from batools.downloader import FileDownloader


class ZipUtils:
    @staticmethod
    def extract_zip(
        zip_path: str | list[str],
        dest_dir: str,
        *,
        keywords: list[str] | None = None,
        zips_dir: str = "",
        password: bytes = bytes(),
        progress_bar: bool = True,
    ) -> list[str]:
        """Extracts specific files from a zip archive(s) to a destination directory.

        Args:
            zip_path (str | list[str]): Path(s) to the zip file(s).
            dest_dir (str): Directory where files will be extracted.
            keywords (list[str], optional): List of keywords to filter files for extraction. Defaults to None.
            zips_dir (str, optional): Base directory for relative paths when zip_path is a list. Defaults to "".
            progress_bar (str, optional): Create a progress bar during extract. Defaults to False.


        Returns:
            list[str]: List of extracted file paths.
        """
        if progress_bar:
            print(f"Extracting files from {zip_path} to {dest_dir}...")
        extract_list: list[str] = []
        zip_files = []

        if isinstance(zip_path, str):
            zip_files = [zip_path]
        elif isinstance(zip_path, list):
            zip_files = [os.path.join(zips_dir, p) for p in zip_path]

        os.makedirs(dest_dir, exist_ok=True)

        if progress_bar:
            bar = ProgressBar(len(extract_list), "Extract...", "items")
        for zip_file in zip_files:
            try:
                with ZipFile(zip_file, "r") as z:
                    if keywords:
                        extract_list = [
                            item for k in keywords for item in z.namelist() if k in item
                        ]
                        for item in extract_list:
                            try:
                                z.extract(item, dest_dir, pwd=password if password else None)
                            except Exception as e:
                                notice(str(e))
                            if progress_bar:
                                bar.increase()
                    else:
                        z.extractall(dest_dir, pwd=password if password else None)

            except Exception as e:
                notice(f"Error processing file '{zip_file}': {e}")
        if progress_bar:
            bar.stop()
        return extract_list

    @staticmethod
    def create_zip(
        file_paths: str | list[str],
        dest_zip: str,
        *,
        keywords: list[str] | None = None,
        base_dir: str = "",
        compression: int = ZIP_DEFLATED,
        password: bytes = bytes(),
        progress_bar: bool = False,
        verbose: bool = False,
    ) -> bool:
        """Compresses specific files into a zip archive.

        Args:
            file_paths (str | list[str]): Path(s) to the files or directories to compress.
            dest_zip (str): Path where the resulting zip file will be saved.
            keywords (list[str], optional): List of keywords to filter files for compression. Defaults to None.
            base_dir (str, optional): Base directory for relative paths in the zip. Defaults to "".
            compression (int, optional): Compression method. Defaults to ZIP_DEFLATED.
            password (bytes, optional): Password for the zip file. Defaults to bytes().
            progress_bar (bool, optional): Create a progress bar during compression. Defaults to True.
            verbose (bool, optional): Output verbose debugging logs.

        Returns:
            bool: True if compression was successful.
        """

        if progress_bar:
            print(f"Compressing files to {dest_zip}...")

        if verbose:
            print(f"[VERBOSE] Target ZIP: {dest_zip}")
            print(f"[VERBOSE] Password: {password.decode() if password else 'None'}")
            print(f"[VERBOSE] Base Directory: {base_dir}")

        input_paths = [file_paths] if isinstance(file_paths, str) else file_paths
        files_to_add = []

        for path in input_paths:
            full_path = os.path.join(base_dir, path)
            if os.path.isfile(full_path):
                files_to_add.append(full_path)
            elif os.path.isdir(full_path):
                files_to_add.extend(
                    os.path.join(root, file)
                    for root, _, files in os.walk(full_path)
                    for file in files
                )

        if keywords:
            files_to_add = [f for f in files_to_add if any(k in f for k in keywords)]

        if not files_to_add:
            return False

        bar = ProgressBar(len(files_to_add), "Compress...", "items") if progress_bar else None

        try:
            os.makedirs(os.path.dirname(os.path.abspath(dest_zip)), exist_ok=True)

            if password:
                pyminizip.compress_multiple(
                    files_to_add,
                    [],
                    dest_zip,
                    password.decode(),
                    5
                )
            else:
                with ZipFile(dest_zip, "w", compression=compression) as z:
                    for file in files_to_add:
                        arcname = os.path.relpath(file, base_dir) if base_dir else os.path.basename(file)
                        z.write(file, arcname)
                        if bar:
                            bar.increase()

            if bar:
                bar.stop()
            return True
        except Exception as e:
            notice(f"Error creating zip '{dest_zip}': {e}")
            if bar:
                bar.stop()
            return False

    # Used to parse the area where the EOCD (End of Central Directory) of the compressed file's central directory is located.
    @staticmethod
    def parse_eocd_area(data: bytes) -> tuple[int, int]:
        eocd_signature = b"\x50\x4b\x05\x06"
        eocd_offset = data.rfind(eocd_signature)
        if eocd_offset == -1:
            raise EOFError("Cannot read the eocd of file.")
        eocd = data[eocd_offset : eocd_offset + 22]
        _, _, _, _, _, cd_size, cd_offset, _ = struct.unpack("<IHHHHIIH", eocd)
        return cd_offset, cd_size

    # Used to parse the files contained in the central directory. Use for common apk.
    @staticmethod
    def parse_central_directory_data(data: bytes) -> list:
        file_headers = []
        offset = 0
        while offset < len(data):
            if data[offset : offset + 4] != b"\x50\x4b\x01\x02":
                raise BufferError("Cannot parse the central directory of file.")
            pack = struct.unpack("<IHHHHHHIIIHHHHHII", data[offset : offset + 46])

            uncomp_size = pack[9]
            file_name_length = pack[10]
            extra_field_length = pack[11]
            file_comment_length = pack[12]
            local_header_offset = pack[16]
            file_name = data[offset + 46 : offset + 46 + file_name_length].decode(
                "utf8"
            )

            file_headers.append(
                {"path": file_name, "offset": local_header_offset, "size": uncomp_size}
            )
            offset += 46 + file_name_length + extra_field_length + file_comment_length

        return file_headers

    @staticmethod
    def download_and_decompress_file(
        apk_url: str, target_path: str, header_part: bytes, start_offset: int
    ) -> bool:
        """Request partial data from an online compressed file and then decompress it."""
        try:
            header = struct.unpack("<IHHHHHIIIHH", header_part[:30])
            _, _, _, compression, _, _, _, comp_size, _, file_name_len, extra_len = (
                header
            )
            data_start = start_offset + 30 + file_name_len + extra_len
            data_end = data_start + comp_size
            compressed_data = FileDownloader(
                apk_url,
                headers={"Range": f"bytes={data_start}-{data_end - 1}"},
            )
            return ZipUtils.decompress_file_part(
                compressed_data, target_path, compression
            )
        except:
            return False

    @staticmethod
    def decompress_file_part(compressed_data_part, file_path, compress_method) -> bool:
        """Decompress pure compressed data. Return True if saved to path."""
        try:
            if compress_method == 8:  # Deflate compression
                decompressor = zlib.decompressobj(-zlib.MAX_WBITS)
                decompressed_data = decompressor.decompress(compressed_data_part)
                decompressed_data += decompressor.flush()
            else:
                decompressed_data = compressed_data_part
            with open(file_path, "wb") as file:
                file.write(decompressed_data)
            return True
        except:
            return False
