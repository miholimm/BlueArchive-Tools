import os
import shutil
import tempfile
import json
import zipfile
from pathlib import Path
from typing import Optional

from utils.config import Config
from utils.catalog import JPCatalog, GLCatalog, CNCatalog
from utils.encryption import xor_with_key, zip_password, calculate_crc
from utils.download import ResourceDownloader
from utils.git import Git
from utils.regions import Server
from utils.util import ZipUtils, FileUtils, notice
from xtractor.table import TableTask, TableProcess, TableExtract, TableRepack


class TableLocalizationBuilder:
    """
    自动化游戏数据表汉化与重打包管线
    1. 下载官方最新 TableCatalog.bytes 与 Excel.zip
    2. 解密提取官方原始 FlatBuffers (.flat) 与 JSON 表格
    3. 合并 BA-Text 翻译库或自定义汉化文本
    4. 重新序列化并加密各数据表 (OTP XOR + xxHash/MT19937)
    5. 重打包生成加密 Excel.zip
    6. 计算校验并更新 TableCatalog.bytes (通过 MemoryPack)
    7. 输出符合官方客户端或代理分发标准的 TableBundles 汉化补丁包
    """

    def __init__(
        self,
        server: str = "JP",
        text_dir: Optional[str] = None,
        output_dir: str = "output/TableBundles",
        flat_data_module: str = "FlatData",
    ):
        self.server = server
        self.text_dir = text_dir
        self.output_dir = output_dir
        self.flat_data_module = flat_data_module

        self.temp_dir = tempfile.mkdtemp(prefix="TableLocalize_")
        self.download_dir = os.path.join(self.temp_dir, "downloads")
        self.work_dir = os.path.join(self.temp_dir, "work")
        self.extracted_dir = os.path.join(self.work_dir, "extracted")
        self.repacked_dir = os.path.join(self.work_dir, "repacked")

        for d in (self.download_dir, self.work_dir, self.extracted_dir, self.repacked_dir):
            os.makedirs(d, exist_ok=True)

    def cleanup(self):
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir, ignore_errors=True)
            print("[TableBuilder] 临时工作空间已清理。")

    def _prepare_flatdata(self):
        task = TableTask(server=self.server)
        task.prepare_flatdata()

    def _prepare_text_repo(self) -> str:
        """获取汉化文本库"""
        if self.text_dir and os.path.isdir(self.text_dir):
            print(f"[TableBuilder] 使用指定汉化目录: {self.text_dir}")
            return self.text_dir

        local_ba_text = os.path.join(".", "BA-Text")
        if os.path.isdir(local_ba_text) and os.listdir(local_ba_text):
            print(f"[TableBuilder] 发现本地 BA-Text: {local_ba_text}")
            return local_ba_text

        text_clone_dir = os.path.join(self.temp_dir, "BA-Text")
        print(f"[TableBuilder] 正在拉取官方汉化库: {Config.Text_repositories} ...")
        try:
            Git().clone(Config.Text_repositories, text_clone_dir)
            return text_clone_dir
        except Exception as e:
            notice(f"[TableBuilder] 拉取 BA-Text 失败: {e}，将尝试在当前目录寻找汉化文件", "warning")
            return ""

    def download_official_assets(self) -> tuple[dict, str]:
        """下载官方 TableCatalog 与 Excel.zip"""
        downloader = ResourceDownloader(self.server, verbose=True)

        excel_zip_path = os.path.join(self.download_dir, "Excel.zip")

        print(f"[TableBuilder] 正在获取官方 TableCatalog ...")
        catalog_dict = downloader.get_table_catalog()
        if not catalog_dict or not isinstance(catalog_dict, dict):
            raise RuntimeError("获取官方 TableCatalog 失败！")

        print(f"[TableBuilder] 正在下载官方 Excel.zip ...")
        files_result = downloader.get_table_files(["Excel.zip"], save_path=self.download_dir, workers=2)
        if not files_result or not os.path.exists(excel_zip_path):
            raise RuntimeError("下载官方 Excel.zip 失败！")

        print(f"[TableBuilder] 官方资源下载成功:")
        print(f"  - TableCatalog: 解析成功 ({len(catalog_dict.get('Table', {}))} 项)")
        print(f"  - Excel.zip:    {excel_zip_path} ({os.path.getsize(excel_zip_path)} 字节)")

        return catalog_dict, excel_zip_path

    def run(self) -> dict:
        try:
            print("=" * 60)
            print(f"[*] 启动蔚蓝档案 [{self.server}] 自动化汉化与打包管线")
            print("=" * 60)

            # 1. 准备 FlatData
            self._prepare_flatdata()

            # 2. 准备汉化文本
            active_text_dir = self._prepare_text_repo()

            # 3. 下载官方数据
            catalog_dict, official_zip_path = self.download_official_assets()

            # 4. 初始化 TableProcess
            table_proc = TableProcess(
                server=self.server,
                table_file_folder=self.download_dir,
                extract_folder=self.extracted_dir,
                flat_data_module_name=self.flat_data_module,
            )

            # 5. 解压官方 Excel.zip
            official_unzip_dir = os.path.join(self.work_dir, "official_unpacked")
            os.makedirs(official_unzip_dir, exist_ok=True)
            password = zip_password("Excel.zip") if self.server != "CN" else None

            print("[TableBuilder] 正在解压并解密官方 Excel.zip 内容...")
            ZipUtils.extract_zip(
                zip_path=official_zip_path,
                dest_dir=official_unzip_dir,
                password=password,
                progress_bar=False,
            )

            # 6. 处理/替换汉化表格
            repack_table = TableRepack(
                server=self.server,
                table_file_folder=self.download_dir,
                extract_folder=self.extracted_dir,
                flat_data_module_name=self.flat_data_module,
            )

            # 遍历汉化文本源并应用
            modified_count = 0
            if active_text_dir and os.path.isdir(active_text_dir):
                print(f"[TableBuilder] 正在扫描汉化文件并重新序列化...")
                search_dirs = [
                    os.path.join(active_text_dir, "Excel"),
                    os.path.join(active_text_dir, "ExcelDB"),
                    active_text_dir,
                ]

                for sdir in search_dirs:
                    if not os.path.isdir(sdir):
                        continue
                    for root, _, files in os.walk(sdir):
                        for file in files:
                            # 1) 直接提供修改后的 .flat 文件
                            if file.endswith(".flat"):
                                base_class = file.removesuffix(".flat")
                                flat_path = os.path.join(root, file)
                                with open(flat_path, "rb") as ff:
                                    flat_bytes = ff.read()
                                enc_bytes = xor_with_key(base_class, flat_bytes)
                                # 写入 official_unpacked 对应路径
                                target_name = f"{base_class.lower()}.bytes"
                                written = False
                                for ur, _, ufiles in os.walk(official_unzip_dir):
                                    for uf in ufiles:
                                        if uf.lower() == target_name:
                                            with open(os.path.join(ur, uf), "wb") as wf:
                                                wf.write(enc_bytes)
                                            written = True
                                            modified_count += 1
                                            print(f"  [+] 应用已编译 .flat: {base_class}")
                                            break
                                    if written:
                                        break

                            # 2) 提供 JSON 汉化文本
                            elif file.endswith(".json"):
                                base_name = file.removesuffix(".json")
                                json_path = os.path.join(root, file)
                                try:
                                    with open(json_path, "r", encoding="utf-8") as jf:
                                        json_data = json.load(jf)

                                    source = "ExcelDB" if "ExcelDB" in root else "Excel"
                                    item_data, new_name = repack_table._repack_bytes_file(
                                        file, json_data, False, True, source
                                    )

                                    if new_name and item_data:
                                        written = False
                                        for ur, _, ufiles in os.walk(official_unzip_dir):
                                            for uf in ufiles:
                                                if uf.lower() == new_name.lower():
                                                    with open(os.path.join(ur, uf), "wb") as wf:
                                                        wf.write(item_data)
                                                    written = True
                                                    modified_count += 1
                                                    print(f"  [+] 成功重打包汉化表: {base_name} ({len(item_data)} 字节)")
                                                    break
                                            if written:
                                                break
                                except Exception as e:
                                    # 部分结构若无完整映射跳过，避免中断
                                    pass

            print(f"[TableBuilder] 汉化表格应用完毕，共修改/注入: {modified_count} 个表。")

            # 7. 打包新的 Excel.zip
            repacked_excel_zip = os.path.join(self.repacked_dir, "Excel.zip")
            print(f"[TableBuilder] 正在创建新的加密 Excel.zip ...")

            files_to_pack = []
            for root, _, files in os.walk(official_unzip_dir):
                for f in files:
                    rel_p = os.path.relpath(os.path.join(root, f), official_unzip_dir)
                    files_to_pack.append(rel_p)

            success = ZipUtils.create_zip(
                file_paths=files_to_pack,
                dest_zip=repacked_excel_zip,
                base_dir=official_unzip_dir,
                password=password,
                progress_bar=False,
            )
            if not success or not os.path.exists(repacked_excel_zip):
                raise RuntimeError("创建加密 Excel.zip 失败！")

            new_crc = calculate_crc(repacked_excel_zip)
            new_size = os.path.getsize(repacked_excel_zip)
            print(f"[TableBuilder] 新 Excel.zip 构建成功:")
            print(f"  - 大小: {new_size} 字节")
            print(f"  - CRC32: {new_crc}")

            # 8. 更新 TableCatalog.bytes
            print(f"[TableBuilder] 正在更新 TableCatalog.bytes ...")
            jp_catalog = JPCatalog()

            if "Table" in catalog_dict and "Excel.zip" in catalog_dict["Table"]:
                orig_entry = catalog_dict["Table"]["Excel.zip"]
                print(f"  - 原始 CRC: {orig_entry.get('Crc')}, 大小: {orig_entry.get('Size')}")
                orig_entry["Crc"] = new_crc
                orig_entry["Size"] = new_size
                orig_entry["isChanged"] = True
                print(f"  - 更新 CRC: {new_crc}, 大小: {new_size}")

            new_catalog_raw = jp_catalog.pack_table_catalog(catalog_dict)
            repacked_catalog_path = os.path.join(self.repacked_dir, "TableCatalog.bytes")
            with open(repacked_catalog_path, "wb") as ncf:
                ncf.write(new_catalog_raw)

            # 9. 复制到输出目录
            final_table_dir = os.path.join(self.output_dir, "TableBundles")
            os.makedirs(final_table_dir, exist_ok=True)

            shutil.copy2(repacked_catalog_path, os.path.join(final_table_dir, "TableCatalog.bytes"))
            shutil.copy2(repacked_excel_zip, os.path.join(final_table_dir, "Excel.zip"))

            # 10. 创建便于 CDN 发布/分发的一键式 Zip 包
            version_name = Server(self.server).get_version_name()
            dist_zip_name = f"TableBundles_{self.server}_Localized_{version_name}.zip"
            dist_zip_path = os.path.join(self.output_dir, dist_zip_name)

            ZipUtils.create_zip(
                file_paths=["TableCatalog.bytes", "Excel.zip"],
                dest_zip=dist_zip_path,
                base_dir=final_table_dir,
                progress_bar=False,
            )

            print("=" * 60)
            print("[+] 蔚蓝档案自动化汉化管线执行成功！")
            print(f"  - TableCatalog.bytes: {os.path.join(final_table_dir, 'TableCatalog.bytes')}")
            print(f"  - Excel.zip:          {os.path.join(final_table_dir, 'Excel.zip')}")
            print(f"  - 完整分发补丁包:      {dist_zip_path}")
            print("=" * 60)

            return {
                "server": self.server,
                "version": version_name,
                "crc": new_crc,
                "size": new_size,
                "modified_tables": modified_count,
                "dist_zip": dist_zip_path,
                "output_dir": final_table_dir,
            }

        finally:
            self.cleanup()
