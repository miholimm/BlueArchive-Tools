import os
import shutil
import tempfile
import json
import zipfile
import binascii
from datetime import datetime
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

        # Monkey patch FlatData.Excel module methods onto classes for repack_wrapper compatibility
        import importlib
        try:
            excel_mod = importlib.import_module(f"{self.flat_data_module}.Excel")
            for name, val in list(vars(excel_mod).items()):
                if isinstance(val, type):
                    try:
                        m = importlib.import_module(f"{self.flat_data_module}.Excel.{name}")
                        for fn in dir(m):
                            if not fn.startswith("_") and not hasattr(val, fn):
                                setattr(val, fn, getattr(m, fn))
                    except Exception:
                        pass
        except Exception as e:
            print(f"[TableBuilder] FlatData monkey-patch notice: {e}")

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

    @staticmethod
    def _merge_table(table_name: str, jp_data: list, text_data: list) -> int:
        if not isinstance(jp_data, list) or not isinstance(text_data, list):
            return 0
        from collections import defaultdict

        replaced = 0
        # 1. ScenarioScriptExcel: (GroupId, row_idx)
        if table_name == "ScenarioScriptExcel.json":
            t_by_group = defaultdict(list)
            for r in text_data:
                if isinstance(r, dict) and "GroupId" in r:
                    t_by_group[r["GroupId"]].append(r)
            j_by_group = defaultdict(list)
            for r in jp_data:
                if isinstance(r, dict) and "GroupId" in r:
                    j_by_group[r["GroupId"]].append(r)
            for gid, jrows in j_by_group.items():
                if gid in t_by_group:
                    trows = t_by_group[gid]
                    for idx in range(min(len(jrows), len(trows))):
                        t_text = trows[idx].get("TextJp")
                        if t_text:
                            jrows[idx]["TextJp"] = t_text
                            replaced += 1
            return replaced

        # 2. Key-based tables: LocalizeExcel, LocalizeErrorExcel
        if table_name in ("LocalizeExcel.json", "LocalizeErrorExcel.json"):
            t_map = {r["Key"]: r["Jp"] for r in text_data if isinstance(r, dict) and "Key" in r and "Jp" in r}
            for r in jp_data:
                if isinstance(r, dict):
                    k = r.get("Key")
                    if k in t_map:
                        r["Jp"] = t_map[k]
                        replaced += 1
            return replaced

        if table_name in ("LocalizeSkillExcel.json", "LocalizeEtcExcel.json"):
            t_map = {r["Key"]: r for r in text_data if isinstance(r, dict) and "Key" in r}
            for r in jp_data:
                if isinstance(r, dict):
                    k = r.get("Key")
                    if k in t_map:
                        t = t_map[k]
                        if "NameJp" in t and t["NameJp"]:
                            r["NameJp"] = t["NameJp"]
                        if "DescriptionJp" in t and t["DescriptionJp"]:
                            r["DescriptionJp"] = t["DescriptionJp"]
                        replaced += 1
            return replaced

        # 3. AcademyMessangerExcel: (MessageGroupId, Id) -> MessageJP
        if table_name == "AcademyMessangerExcel.json":
            t_map = {(r["MessageGroupId"], r["Id"]): r.get("MessageJP") for r in text_data if isinstance(r, dict) and "MessageGroupId" in r and "Id" in r}
            for r in jp_data:
                if isinstance(r, dict):
                    key = (r.get("MessageGroupId"), r.get("Id"))
                    if key in t_map and t_map[key]:
                        r["MessageJP"] = t_map[key]
                        replaced += 1
            return replaced

        # 4. CharacterDialogExcel / CharacterDialogEventExcel / CharacterDialogBattlePassExcel
        if table_name in ("CharacterDialogExcel.json", "CharacterDialogEventExcel.json", "CharacterDialogBattlePassExcel.json"):
            t_map = {}
            for r in text_data:
                if isinstance(r, dict):
                    k = (r.get("CharacterId") or r.get("OriginalCharacterId") or r.get("EventID"), r.get("CostumeUniqueId"), r.get("DisplayOrder"))
                    if "LocalizeJP" in r and r["LocalizeJP"]:
                        t_map[k] = r["LocalizeJP"]
            for r in jp_data:
                if isinstance(r, dict):
                    k = (r.get("CharacterId") or r.get("OriginalCharacterId") or r.get("EventID"), r.get("CostumeUniqueId"), r.get("DisplayOrder"))
                    if k in t_map:
                        r["LocalizeJP"] = t_map[k]
                        replaced += 1
            return replaced

        # 5. CharacterVoiceSubtitleExcel / CharacterDialogSubtitleExcel
        if table_name in ("CharacterVoiceSubtitleExcel.json", "CharacterDialogSubtitleExcel.json"):
            t_map = {(r.get("LocalizeCVGroup"), r.get("CharacterVoiceGroupId") or r.get("CharacterId")): r.get("LocalizeJP") for r in text_data if isinstance(r, dict)}
            for r in jp_data:
                if isinstance(r, dict):
                    k = (r.get("LocalizeCVGroup"), r.get("CharacterVoiceGroupId") or r.get("CharacterId"))
                    if k in t_map and t_map[k]:
                        r["LocalizeJP"] = t_map[k]
                        replaced += 1
            return replaced

        # 6. LocalizeCharProfileExcel: CharacterId
        if table_name == "LocalizeCharProfileExcel.json":
            t_map = {r["CharacterId"]: r for r in text_data if isinstance(r, dict) and "CharacterId" in r}
            for r in jp_data:
                if isinstance(r, dict):
                    cid = r.get("CharacterId")
                    if cid in t_map:
                        t = t_map[cid]
                        for field in ("StatusMessageJp", "FullNameJp"):
                            if field in t and t[field]:
                                r[field] = t[field]
                        replaced += 1
            return replaced

        # 7. LocalizeGachaShopExcel: GachaShopId
        if table_name == "LocalizeGachaShopExcel.json":
            t_map = {r["GachaShopId"]: r for r in text_data if isinstance(r, dict) and "GachaShopId" in r}
            for r in jp_data:
                if isinstance(r, dict):
                    gid = r.get("GachaShopId")
                    if gid in t_map:
                        t = t_map[gid]
                        for field in ("TabNameJp", "TitleNameJp"):
                            if field in t and t[field]:
                                r[field] = t[field]
                        replaced += 1
            return replaced

        # 8. ScenarioCharacterNameExcel: CharacterName
        if table_name == "ScenarioCharacterNameExcel.json":
            t_map = {r["CharacterName"]: r for r in text_data if isinstance(r, dict) and "CharacterName" in r}
            for r in jp_data:
                if isinstance(r, dict):
                    cname = r.get("CharacterName")
                    if cname in t_map:
                        t = t_map[cname]
                        for field in ("NameJP", "NicknameJP"):
                            if field in t and t[field]:
                                r[field] = t[field]
                        replaced += 1
            return replaced

        # 9. TutorialCharacterDialogExcel: TalkId
        if table_name == "TutorialCharacterDialogExcel.json":
            t_map = {r["TalkId"]: r.get("LocalizeJP") for r in text_data if isinstance(r, dict) and "TalkId" in r}
            for r in jp_data:
                if isinstance(r, dict):
                    tid = r.get("TalkId")
                    if tid in t_map and t_map[tid]:
                        r["LocalizeJP"] = t_map[tid]
                        replaced += 1
            return replaced

        # 10. Fallback: match by index
        for idx in range(min(len(jp_data), len(text_data))):
            jrow = jp_data[idx]
            trow = text_data[idx]
            if isinstance(jrow, dict) and isinstance(trow, dict):
                for k, v in trow.items():
                    if k in jrow and v and v != jrow[k]:
                        jrow[k] = v
                        replaced += 1
        return replaced

    def _merge_and_build_exceldb(self, active_text_dir: str, dest_dir: str, dist_dir: str, catalog_dict: dict) -> tuple[int, str]:
        """合并 BA-Text 全量汉化文本并生成 SQLite ExcelDB.db 与 DecryptedTables"""
        import sqlite3

        candidates = [
            os.path.join(".", "BA-TableBundles-JP", "ExcelDB"),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "BA-TableBundles-JP", "ExcelDB"),
            os.path.join(active_text_dir, "ExcelDB"),
        ]
        jp_exceldb_dir = next((c for c in candidates if os.path.isdir(c)), None)
        text_exceldb_dir = os.path.join(active_text_dir, "ExcelDB") if os.path.isdir(os.path.join(active_text_dir, "ExcelDB")) else active_text_dir

        if not jp_exceldb_dir or not text_exceldb_dir:
            print("[TableBuilder] 未找到 ExcelDB 文本源，跳过 ExcelDB 融合。")
            return 0, ""

        print("[TableBuilder] 正在融合 BA-Text 全量中文文本至日服数据表 (ExcelDB)...")
        decrypted_out_dir = os.path.join(dist_dir, "DecryptedTables")
        os.makedirs(decrypted_out_dir, exist_ok=True)

        merged_tables = {}
        total_translated_items = 0

        for f in os.listdir(jp_exceldb_dir):
            if not f.endswith(".json"):
                continue
            jp_file = os.path.join(jp_exceldb_dir, f)
            text_file = os.path.join(text_exceldb_dir, f)

            with open(jp_file, "r", encoding="utf-8") as jf:
                jp_data = json.load(jf)

            if os.path.isfile(text_file):
                with open(text_file, "r", encoding="utf-8") as tf:
                    text_data = json.load(tf)

                count = self._merge_table(f, jp_data, text_data)
                total_translated_items += count
                if count > 0:
                    print(f"  [+] 融合汉化表: {f.removesuffix('.json')} ({count} 条文本注入)")

            merged_tables[f.removesuffix(".json")] = jp_data
            with open(os.path.join(decrypted_out_dir, f), "w", encoding="utf-8") as out_f:
                json.dump(jp_data, out_f, ensure_ascii=False, indent=2)

        exceldb_path = os.path.join(dest_dir, "ExcelDB.db")
        print(f"[TableBuilder] 正在生成完整汉化版 ExcelDB.db: {exceldb_path} ...")
        if os.path.exists(exceldb_path):
            os.remove(exceldb_path)

        conn = sqlite3.connect(exceldb_path)
        cur = conn.cursor()

        for table_name, rows in merged_tables.items():
            if not rows or not isinstance(rows, list):
                continue
            sample = rows[0]
            if not isinstance(sample, dict):
                continue
            seen_lower = set()
            cols = []
            for c in sample.keys():
                if not c:
                    continue
                clower = c.lower()
                if clower in seen_lower:
                    continue
                seen_lower.add(clower)
                cols.append(c)
            if not cols:
                continue
            col_types = []
            for col in cols:
                v = sample.get(col)
                if isinstance(v, int):
                    col_types.append(f"[{col}] INTEGER")
                elif isinstance(v, float):
                    col_types.append(f"[{col}] REAL")
                else:
                    col_types.append(f"[{col}] TEXT")
            if not col_types:
                continue
            cur.execute(f"CREATE TABLE IF NOT EXISTS [{table_name}] ({', '.join(col_types)});")
            placeholders = ", ".join(["?"] * len(cols))
            batch = []
            for r in rows:
                if isinstance(r, dict):
                    batch.append([r.get(c) if not isinstance(r.get(c), (list, dict)) else json.dumps(r.get(c), ensure_ascii=False) for c in cols])
            if batch:
                cur.executemany(f"INSERT INTO [{table_name}] VALUES ({placeholders})", batch)

        conn.commit()
        cur.execute("VACUUM")
        conn.close()

        exceldb_size = os.path.getsize(exceldb_path)
        exceldb_crc = calculate_crc(exceldb_path)
        print(f"[TableBuilder] 汉化版 ExcelDB.db 生成完成 (大小: {exceldb_size} 字节, CRC32: {exceldb_crc})")

        if "Table" in catalog_dict and "ExcelDB.db" in catalog_dict["Table"]:
            orig = catalog_dict["Table"]["ExcelDB.db"]
            orig["Crc"] = exceldb_crc
            orig["Size"] = exceldb_size
            orig["isChanged"] = True

        return total_translated_items, exceldb_path

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

                                    if file == "CharacterDialogFieldExcelTable.json" and isinstance(json_data, list):
                                        for row in json_data:
                                            if isinstance(row, dict) and "GroupId" in row:
                                                gid = row["GroupId"] & 0xFFFFFFFF
                                                if gid > 0x7FFFFFFF:
                                                    gid -= 0x100000000
                                                row["GroupId"] = gid

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

            # 8. 融合 BA-Text 全量剧情与文本并生成 ExcelDB.db
            final_table_dir = os.path.join(self.output_dir, "TableBundles")
            os.makedirs(final_table_dir, exist_ok=True)
            db_translated_count, repacked_exceldb = self._merge_and_build_exceldb(
                active_text_dir=active_text_dir,
                dest_dir=self.repacked_dir,
                dist_dir=self.output_dir,
                catalog_dict=catalog_dict,
            )

            # 9. 更新 TableCatalog.bytes
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

            # 10. 复制核心文件到最终 TableBundles 目录
            shutil.copy2(repacked_catalog_path, os.path.join(final_table_dir, "TableCatalog.bytes"))
            shutil.copy2(repacked_excel_zip, os.path.join(final_table_dir, "Excel.zip"))
            if repacked_exceldb and os.path.exists(repacked_exceldb):
                shutil.copy2(repacked_exceldb, os.path.join(final_table_dir, "ExcelDB.db"))

            # 复制其他数据库骨架（若存在）
            for aux_db in ["LogicEffectDataDBSchema.db", "LevelSkillDataDBSchema.db", "SkillVisualEffectDataDBSchema.db"]:
                aux_candidates = [
                    os.path.join(".", "temp_test", aux_db),
                    os.path.join(r"c:\Users\flhan\WorkBuddy\bluearchive\downloads\jp\tables\TableBundles", aux_db),
                ]
                for cand in aux_candidates:
                    if os.path.isfile(cand):
                        shutil.copy2(cand, os.path.join(final_table_dir, aux_db))
                        break

            # 11. 撰写安装说明 README.txt
            version_name = Server(self.server).get_version_name()
            readme_path = os.path.join(self.output_dir, "README.txt")
            with open(readme_path, "w", encoding="utf-8") as rf:
                rf.write(f"""==================================================
蔚蓝档案 (Blue Archive) 日服全量汉化补丁
适配游戏版本: {version_name}
汉化来源: BlueArchive-Translation (BA-Text)
更新日期: {datetime.now().strftime("%Y-%m-%d")}
==================================================

【适用平台】
- Windows 桌面端 (DMM Game Player / Steam)
- Android 移动端 / 模拟器 (MuMu / 蓝叠 / 雷电)
- iOS 移动端 (巨魔 TrollStore / AltStore / SideStore)

【安装指南】
1. Windows (DMM 客户端):
   解压本补丁包，将 TableBundles 文件夹内的全部文件覆盖至游戏安装目录:
   BlueArchive_Data\\StreamingAssets\\TableBundles\\

2. Android 移动端 / 模拟器:
   将 TableBundles 文件夹复制并替换至存储目录:
   Android/data/com.YostarJP.BlueArchive/files/TableBundles/

3. iOS (自签 / Sideload):
   使用 Filza 或解包 IPA，将 TableBundles 注入到:
   Payload/BlueArchive.app/Data/Raw/TableBundles/

【校验说明】
请在汉化官网核对 SHA256 校验码确保下载完整。
==================================================
""")

            # 12. 创建便于 CDN 发布/分发的一键式 Zip 包
            dist_zip_name = f"TableBundles_{self.server}_Localized_{version_name}.zip"
            dist_zip_path = os.path.join(self.output_dir, dist_zip_name)

            table_files_to_pack = [f for f in os.listdir(final_table_dir) if os.path.isfile(os.path.join(final_table_dir, f))]
            ZipUtils.create_zip(
                file_paths=table_files_to_pack,
                dest_zip=dist_zip_path,
                base_dir=final_table_dir,
                progress_bar=False,
            )

            # 13. 创建面向最终玩家的完整补丁包 BlueArchive_JP_CN_Patch_{version}.zip
            patch_zip_name = f"BlueArchive_{self.server}_CN_Patch_{version_name}.zip"
            patch_zip_path = os.path.join(self.output_dir, patch_zip_name)
            patch_zip_files = []
            for root, _, files in os.walk(self.output_dir):
                for f in files:
                    full_p = os.path.join(root, f)
                    if full_p in (dist_zip_path, patch_zip_path):
                        continue
                    patch_zip_files.append(os.path.relpath(full_p, self.output_dir))

            ZipUtils.create_zip(
                file_paths=patch_zip_files,
                dest_zip=patch_zip_path,
                base_dir=self.output_dir,
                progress_bar=False,
            )

            # 计算各发布包校验码
            import hashlib
            def file_checksums(p):
                with open(p, "rb") as f:
                    content = f.read()
                return {
                    "size": len(content),
                    "md5": hashlib.md5(content).hexdigest(),
                    "sha256": hashlib.sha256(content).hexdigest(),
                    "crc32": binascii.crc32(content) & 0xFFFFFFFF,
                }

            patch_ck = file_checksums(patch_zip_path)
            dist_ck = file_checksums(dist_zip_path)

            # 14. 自动部署至汉化官网下载目录 (若存在)
            web_dirs = [
                r"c:\Users\flhan\WorkBuddy\bluearchive\downloads\jp",
                r"c:\Users\flhan\WorkBuddy\bluearchive\public\downloads\jp",
            ]
            for wdir in web_dirs:
                try:
                    os.makedirs(wdir, exist_ok=True)
                    shutil.copy2(patch_zip_path, os.path.join(wdir, patch_zip_name))
                    shutil.copy2(dist_zip_path, os.path.join(wdir, dist_zip_name))
                    # 复制 TableBundles
                    w_tb = os.path.join(wdir, "TableBundles")
                    os.makedirs(w_tb, exist_ok=True)
                    for tf in table_files_to_pack:
                        shutil.copy2(os.path.join(final_table_dir, tf), os.path.join(w_tb, tf))
                    print(f"[TableBuilder] 补丁已自动同步至官网目录: {wdir}")
                except Exception as e:
                    print(f"[TableBuilder] 同步官网目录跳过: {wdir} ({e})")

            print("=" * 60)
            print("[+] 蔚蓝档案全量汉化管线执行成功！")
            print(f"  - TableCatalog.bytes: {os.path.join(final_table_dir, 'TableCatalog.bytes')}")
            print(f"  - Excel.zip:          {os.path.join(final_table_dir, 'Excel.zip')}")
            if repacked_exceldb:
                print(f"  - ExcelDB.db:         {repacked_exceldb}")
            print(f"  - CDN 分发包:         {dist_zip_path} ({dist_ck['size'] / 1024 / 1024:.2f} MB)")
            print(f"  - 完整玩家补丁包:     {patch_zip_path} ({patch_ck['size'] / 1024 / 1024:.2f} MB)")
            print(f"  - 累计注入汉化行数:   {db_translated_count} 条")
            print("=" * 60)

            return {
                "server": self.server,
                "version": version_name,
                "crc": new_crc,
                "size": new_size,
                "modified_tables": modified_count,
                "db_translated_count": db_translated_count,
                "dist_zip": dist_zip_path,
                "dist_checksum": dist_ck,
                "patch_zip": patch_zip_path,
                "patch_checksum": patch_ck,
                "output_dir": final_table_dir,
            }

        finally:
            self.cleanup()
