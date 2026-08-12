import os
import sys
import json
import shutil
import copy
import concurrent.futures
from argparse import ArgumentParser
from pathlib import Path
from collections import defaultdict

from xtractor.table import TableProcess
from utils.config import Config
from lib.encryption import calculate_crc
from xtractor.catalog import CatalogMemoryPack
from lib.console import notice
from voice_build import update_voice_excel_cn, update_voice_excel_kr, update_media_catalog

def run_extraction(table_folder: Path, output_folder: Path):
    """提取ExcelDB.db和Excel.zip，用于Repack缺失原数据以及Extract模式。"""
    output_folder.mkdir(parents=True, exist_ok=True)

    process = TableProcess(str(table_folder), str(output_folder), "FlatData")

    for file_name in ["ExcelDB.db", "Excel.zip"]:
        if (table_folder / file_name).exists():
            process.process_table(file_name, "Extract")
            notice(f"正在提取{file_name}。")

def apply_replacements(base_dir: Path, base_replacement_dir: Path, output_dir: Path, ignore_files=None):
    """替换文本"""

    ignore_files = set(ignore_files or [])

    with open("other/repack_config.json", "r", encoding="utf8") as f:
        config = json.load(f)
        
    for category in ["ExcelDB", "Excel"]:
        category_config = config.get(Config.server, {}).get(category, {})
        for filename, file_cfg in category_config.items():

            if filename in ignore_files:
                notice(f"跳过{filename}。")
                continue
                
            input_path = base_dir / category / filename
            replacement_path = base_replacement_dir / category / filename

            if not input_path.exists():
                notice(f"{input_path}不存在！")
                continue
            if not replacement_path.exists():
                notice(f"{replacement_path}不存在！")
                continue

            with open(input_path, "r", encoding="utf8") as f:
                original_data = json.load(f)
            with open(replacement_path, "r", encoding="utf8") as f:
                modified_data = json.load(f)
                
            index_keys = file_cfg["Index"]
            repack_keys = file_cfg["Repack"]
            
            # 使用列表队列存储相同索引的多个项，防止覆盖
            repl_map = defaultdict(list)
            for item in modified_data:
                key = tuple(item.get(k) for k in index_keys)
                repl_map[key].append(item)
            
            for item in original_data:
                match_key = tuple(item.get(k) for k in index_keys)
                # 如果队列里还有元素，按顺序弹出第一个进行一对一匹配
                if match_key in repl_map and repl_map[match_key]:
                    replacement_item = repl_map[match_key].pop(0)
                    for r_key in repack_keys:
                        if r_key in replacement_item:
                            item[r_key] = replacement_item[r_key]
                            
            out_path = output_dir / category / filename
            out_path.parent.mkdir(parents=True, exist_ok=True)
            with open(out_path, "w", encoding="utf8") as f:
                json.dump(original_data, f, ensure_ascii=False, indent=2)
            notice(f"{out_path}替换完成。")

def process_scenario(lang: str, source_scenario: Path, repl_scenario: Path, out_scenario: Path):
    """ 处理ScenarioScriptExcel.json的文本替换和VoiceId替换 """
    with open(source_scenario, "r", encoding="utf8") as f:
        data = json.load(f)

    with open("other/repack_config.json", "r", encoding="utf8") as f:
        config = json.load(f)

    file_cfg = config.get(Config.server, {}).get("ExcelDB", {}).get("ScenarioScriptExcel.json")

    with open(repl_scenario, "r", encoding="utf8") as f:
        repl_data = json.load(f)

    index_keys = file_cfg["Index"]
    repack_keys = file_cfg["Repack"]

    # 存在多行相同 GroupId 时，使用列表队列排队，防止后面的文本把前面的覆盖
    repl_map = defaultdict(list)
    for item in repl_data:
        key = tuple(item.get(k) for k in index_keys)
        repl_map[key].append(item)

    for item in data:
        match_key = tuple(item.get(k) for k in index_keys)
        # 如果队列中还有未处理的替换文本，按顺序弹出
        if match_key in repl_map and repl_map[match_key]:
            rep_item = repl_map[match_key].pop(0)
            for r_key in repack_keys:
                # 原版和韩配跳过，中配覆盖用于后续VoiceExcel.json的生成
                if r_key == "VoiceId" and lang in ("Default", "KR"):
                    continue
                if r_key in rep_item:
                    item[r_key] = rep_item[r_key]

            # KR 分支下，将 VoiceKR 的内容强制覆盖并替换掉原本的 VoiceId
            if lang == "KR" and "VoiceKR" in rep_item:
                item["VoiceId"] = rep_item["VoiceKR"]

    out_scenario.parent.mkdir(parents=True, exist_ok=True)

    with open(out_scenario, "w", encoding="utf8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def debug_scenario(target_dir: Path):
    """ 互换GroupId，达成提前录制剧情。 """
    scenario_path = target_dir / "ExcelDB" / "ScenarioScriptExcel.json"

    if not scenario_path.exists(): 
        notice(f"{scenario_path}文件不存在！")
        return
        
    with open(scenario_path, "r", encoding="utf8") as f:
        original_data = json.load(f)
    with open(args.debug_json, "r", encoding="utf8") as f:
        debug_map = json.load(f)
        
    data = list(original_data)

    # 将需要修改的GroupId替换为被修改的，两方GroupId互换。
    for old_id, new_id in debug_map.items():
        old_id_str, new_id_str = str(old_id), str(new_id)
        template = [item for item in original_data if str(item.get("GroupId")) == new_id_str]
        data = [item for item in data if str(item.get("GroupId")) != old_id_str]

        if not template:
            continue

        insert_index = next((i for i, item in enumerate(data) if str(item.get("GroupId")) == new_id_str), len(data))
        for item in template:
            ni = item.copy()
            ni["GroupId"] = int(old_id) if isinstance(item.get("GroupId"), int) else old_id
            data.insert(insert_index, ni)

    with open(scenario_path, "w", encoding="utf8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    notice(f"文件{scenario_path}のdebug模式修改完成！")

def build_lang_package(lang, args, catalog_data, base_db, source_dir):
    notice(f"[{lang}] 正在启动独立语种增量构建线程...")
    
    temp_work = args.table_file_folder.parent / f"TempWorkspace_{lang}"
    temp_db_dir = temp_work / args.file_path.name
    temp_exceldb_dir = temp_db_dir / "ExcelDB"
 
    if temp_work.exists():
        shutil.rmtree(temp_work)

    temp_exceldb_dir.mkdir(parents=True, exist_ok=True)

    # 将基础DB复制到独立语种版
    shutil.copy(base_db, temp_work / "ExcelDB.db")
    
    source_scenario = source_dir / "ExcelDB" / "ScenarioScriptExcel.json"
    source_voice = source_dir / "ExcelDB" / "VoiceExcel.json"

    out_scenario = temp_exceldb_dir / "ScenarioScriptExcel.json"
    out_voice = temp_exceldb_dir / "VoiceExcel.json"

    if source_voice.exists():
        shutil.copy(source_voice, out_voice)
        
    repl_scenario = args.repack_dir / "ExcelDB" / "ScenarioScriptExcel.json"
    if source_scenario.exists():
        # 处理ScenarioScriptExcel.json
        process_scenario(lang, source_scenario, repl_scenario, out_scenario)

    # debug处理
    if args.debug:
        debug_scenario(temp_db_dir)

    # MediaCatalog.json和VoiceExcel.json处理
    if lang == "CN":
        update_voice_excel_cn(out_voice, out_scenario)
        update_media_catalog("CN", args.server, temp_work)
    elif lang == "KR":
        update_voice_excel_kr(out_voice, out_scenario)
        update_media_catalog("KR", args.server, temp_work)

    # 用临时文件打包成独立语种
    process = TableProcess(str(temp_work), str(temp_db_dir), "FlatData")
    process.process_table("ExcelDB.db", "Repack")

    # 如果是Default就直接生成到args.table_file_folder，否则args.table_file_folder/lang
    lang_dir = args.table_file_folder / lang if lang != "Default" else args.table_file_folder
    lang_dir.mkdir(parents=True, exist_ok=True)

    # 移动到指定语言文件夹
    db_generated = temp_work / "ExcelDB.db"
    if db_generated.exists():
        db_crc = calculate_crc(db_generated)
        db_size = os.path.getsize(db_generated)
        target_db_name = f"6993339912994747134_{db_crc}" if args.name else "ExcelDB.db"
        shutil.move(db_generated, lang_dir / target_db_name)
        notice("移动完成。")

    # 处理TaleCatalog.json
    if catalog_data:
        current_catalog = copy.deepcopy(catalog_data)
        current_catalog["Table"]["ExcelDB.db"].update({"Size": db_size, "Crc": db_crc})
        
        lang_catalog_json = temp_work / f"TableCatalog_{lang}.json"
        with open(lang_catalog_json, "w", encoding="utf-8") as f:
            json.dump(current_catalog, f, indent=2, ensure_ascii=False)

        # 国服不需要解密，下载的就是json版
        # 国服结构相同，但Crc实际是MD5，故此代码不可用            
        if Config.server != "CN":
            catalog_bytes_dir = Path("Catalog") / lang if lang != "Default" else Path("Catalog")
            catalog_bytes_dir.mkdir(parents=True, exist_ok=True)
            
            CatalogMemoryPack(install_dir="tools").run(
                server=args.server, mode="serialize", catalog_type="table",
                input_path=str(lang_catalog_json.absolute()),
                output_path=str((catalog_bytes_dir / "TableCatalog.bytes").absolute())
            )
            notice(f"[{lang}] TableCatalog 序列化完成")

    shutil.rmtree(temp_work, ignore_errors=True)
    notice(f"[{lang}] 完成")

def parse_args():
    p = ArgumentParser()
    p.add_argument("table_file_folder", type=Path)
    p.add_argument("file_path", type=Path) # 在Repack模式下，该路径实际为被替换后的文件存放处
    p.add_argument("server", choices=["CN", "GL", "JP"])
    p.add_argument("type", choices=["Extract", "Repack"])
    p.add_argument("--db_key", type=str)
    p.add_argument("--catalog", action="store_true")
    p.add_argument("--name", action="store_true")
    p.add_argument("--replace", action="store_true")
    p.add_argument("--source_dir", type=Path)
    p.add_argument("--repack_dir", type=Path, default=Path("BA-Text"))
    p.add_argument("--debug", action="store_true")
    p.add_argument("--debug_json", type=Path, default=Path("BA-Text/debug.json"))
    p.add_argument("--voice_lang", nargs="+", choices=["CN", "KR"])
    return p.parse_args()

if __name__ == "__main__":
    args = parse_args()
    Config.server = args.server
    if args.db_key: 
        Config.db_password = args.db_key

    if args.type == "Extract":
        run_extraction(args.table_file_folder, args.file_path)

    if args.type == "Repack":
        source_dir = args.source_dir or Path("TempDB")
        langs_to_process = list(set(args.voice_lang)) if args.voice_lang else ["Default"]

        # 防止污染资源
        if args.file_path.exists():
            shutil.rmtree(args.file_path)

        args.file_path.mkdir(parents=True, exist_ok=True)

        # 如果不进行替换，直接使用args.file_path
        if args.replace:
            # 没有资源就生成资源
            if not args.source_dir:
                run_extraction(args.table_file_folder, source_dir)
            # 先忽略掉这两个文件
            apply_replacements(
                source_dir, 
                args.repack_dir, 
                args.file_path, 
                ignore_files=["ScenarioScriptExcel.json", "VoiceExcel.json"]
            )

        # 确保TableCatalog存在
        if args.catalog and os.path.exists("Download/TableCatalog.json"):
            with open("Download/TableCatalog.json", "r", encoding="utf-8") as f:
                catalog_data = json.load(f)

        # 进行基础打包
        process = TableProcess(str(args.table_file_folder), str(args.file_path), "FlatData")
        for table_name in ["ExcelDB.db", "Excel.zip"]:
            table_path = args.table_file_folder / table_name
            process.process_table(table_name, "Repack")
                
            if table_name == "Excel.zip" and table_path.exists():
                zip_crc = calculate_crc(table_path)

                # 开启args.catalog才会修改
                if catalog_data and args.catalog:
                    catalog_data["Table"][table_name].update({
                        "Size": os.path.getsize(table_path), 
                        "Crc": zip_crc
                    })

                for lang in langs_to_process:
                    # 如果是Default就直接生成到args.table_file_folder，否则args.table_file_folder/lang
                    lang_dir = args.table_file_folder / lang if lang != "Default" else args.table_file_folder
                    lang_dir.mkdir(parents=True, exist_ok=True)
                    target_zip_name = f"16300795542385574620_{zip_crc}" if args.name else "Excel.zip"
                    shutil.copy(table_path, lang_dir / target_zip_name)
                    notice("Excel.zip处理完毕。")
                table_path.unlink()

        base_db = args.table_file_folder / "ExcelDB.db"

        # 最大三线程同时处理
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(3, len(langs_to_process))) as executor:
            futures = [
                executor.submit(build_lang_package, lang, args, catalog_data, base_db, source_dir) 
                for lang in langs_to_process
            ]
            concurrent.futures.wait(futures)

        if base_db.exists():
            base_db.unlink()
        notice("所有语言增量打包处理全部执行完毕！")

