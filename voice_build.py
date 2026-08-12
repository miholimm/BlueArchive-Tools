import os
import re
import json
import copy
from pathlib import Path
from xtractor.catalog import CatalogMemoryPack
from lib.console import notice

def update_voice_excel_cn(voice_excel_path: Path, scenario_script_path: Path):
    with open(voice_excel_path, "r", encoding="utf-8") as f:
        excel_list = json.load(f)

    with open(scenario_script_path, "r", encoding="utf-8") as f:
        scenario_list = json.load(f)

    with open("other/Voice.json", "r", encoding="utf-8") as f:
        voice_data_all = json.load(f)

    voice_data = voice_data_all.get("CN", {})
    existing_ids = {item["Id"] for item in excel_list}
    current_max_unique_id = max((item["UniqueId"] for item in excel_list), default=0)
    current_id_counter = 2026430 # 这是写中配的时间，很浪漫不是吗

    audio_name_to_id = {}
    for item in voice_data.values():
        zip_folder = item.get("zip_name", "").replace(".zip", "")
        for ogg_file in item.get("zip_files", []):
            while current_id_counter in existing_ids: 
                current_id_counter += 1
            current_max_unique_id += 1
            audio_name = os.path.splitext(ogg_file)[0]
            audio_name_to_id[audio_name] = current_id_counter
            
            excel_list.append({
                "UniqueId": current_max_unique_id,
                "Id": current_id_counter,
                "Nation": ["All"],
                "Path": [f"Audio/VOC_CN/{zip_folder}/{audio_name}"],
                "Volume": [1.0]
            })
            existing_ids.add(current_id_counter)
            current_id_counter += 1

    with open(voice_excel_path, "w", encoding="utf-8") as f:
        json.dump(excel_list, f, indent=4, ensure_ascii=False)
        
    for entry in scenario_list:
        voice_id_val = entry.get("VoiceId")
        if not voice_id_val: 
            entry["VoiceId"] = 0
        elif isinstance(voice_id_val, str) and voice_id_val in audio_name_to_id:
            entry["VoiceId"] = audio_name_to_id[voice_id_val]
        
    with open(scenario_script_path, "w", encoding="utf-8") as f:
        json.dump(scenario_list, f, indent=4, ensure_ascii=False)
    notice("Voice & ScenarioScript (CN) 更新完成。")

def update_voice_excel_kr(voice_excel_path: Path, scenario_script_path: Path):
    # 这里需要基础VoiceExcel.json
    with open("BA-TableBundles/ExcelDB/VoiceExcel.json", "r", encoding="utf-8") as f:
        base_id_map = {item["Id"]: item for item in json.load(f) if "Id" in item}
    
    with open(scenario_script_path, "r", encoding="utf-8") as f:
        scenario_list = json.load(f)
        
    needed_kr_ids = set()
    for entry in scenario_list:
        v_id = entry.get("VoiceId")
        if v_id is not None and v_id != "":
            if v_id != 0:
                needed_kr_ids.add(int(v_id))

        # 删掉VoiceKR        
        if "VoiceKR" in entry:
            del entry["VoiceKR"]

    with open(scenario_script_path, "w", encoding="utf-8") as f:
        json.dump(scenario_list, f, indent=4, ensure_ascii=False)

    with open(voice_excel_path, "r", encoding="utf-8") as f:
        current_voice_list = json.load(f)
        current_id_map = {item["Id"]: item for item in current_voice_list if "Id" in item}

    existing_unique_ids = {item["UniqueId"] for item in current_voice_list if "UniqueId" in item}
    current_unique_id_counter = 2026614 # 写韩配代码的时间，很浪漫不是吗

    with open("other/Voice.json", "r", encoding="utf-8") as f:
        voice_data_all = json.load(f)
    audio_to_zip = {}
    for item in voice_data_all.get("KR", {}).values():
        if "repacked" in item:
            for rep in item.get("repacked", []):
                zname = rep.get("zip_name", "")
                for f_file in rep.get("zip_files", []):
                    audio_to_zip[os.path.splitext(f_file)[0]] = zname
        elif "zip_name" in item:
            zname = item.get("zip_name", "")
            aname = os.path.splitext(item.get("ogg_name", ""))[0]
            if aname:
                audio_to_zip[aname] = zname

    # 对提取出来的VoiceExcel整体重构
    for kr_id in needed_kr_ids:
        if kr_id in base_id_map:
            item = copy.deepcopy(base_id_map[kr_id])
            paths = item.get("Path", [])
            volumes = item.get("Volume", [])

            if len(volumes) != len(paths):
                volumes = volumes + [1.0] * (len(paths) - len(volumes))

            new_paths, new_volumes = [], []
            for p, v in zip(paths, volumes):
                if "VOC_JP" not in p:
                    audio_name = p.split('/')[-1]
                    if audio_name in audio_to_zip:
                        p = f"Audio/VOC_KR/{audio_to_zip[audio_name].replace('.zip', '')}/{audio_name}"
                    new_paths.append(p)
                    new_volumes.append(v)

            # 确保UniqueId不冲突
            while current_unique_id_counter in existing_unique_ids:
                current_unique_id_counter += 1

            # 对原始ID保留，并删除VOC_JP的路径
            item.update({
                "UniqueId": current_unique_id_counter,
                "Path": new_paths,
                "Volume": [new_volumes[0]] if len(new_volumes) > 1 else new_volumes,
                "Nation": ["All"]
            })
            
            current_id_map[kr_id] = item
            existing_unique_ids.add(current_unique_id_counter)
            current_unique_id_counter += 1

    with open(voice_excel_path, "w", encoding="utf-8") as f:
        json.dump(list(current_id_map.values()), f, indent=4, ensure_ascii=False)
    notice("Voice & ScenarioScript (KR) 填充完成。")

def update_media_catalog(lang: str, server: str, work_dir: Path):
    with open("Download/MediaCatalog.json", "r", encoding="utf-8") as f:
        media_data = json.load(f)

    with open("other/Voice.json", "r", encoding="utf-8") as f:
        voice_data_all = json.load(f)
        
    table = media_data.get("Table", {})

    if lang == "CN":
        for item in voice_data_all.get("CN", {}).values():
            zip_name = item.get("zip_name", "")
            new_key = f"audio/voc_cn/cn_main/{zip_name.replace('.zip', '').lower()}"
            match = re.search(r"Main_(\d+)\.zip", zip_name)
            is_prologue = bool(match and 11000 <= int(match.group(1)) < 11010)

            table[new_key] = {
                "path": f"GameData/Audio/VOC_CN/{zip_name}", 
                "FileName": zip_name,
                "Bytes": item.get("zip_size"), 
                "Crc": item.get("zip_crc32"),
                "IsPrologue": is_prologue, 
                "IsSplitDownload": False, 
                "MediaType": 1
            }
    elif lang == "KR":
        kr_voice_data = voice_data_all.get("KR", {})
        
        repacked_zips = {}
        for item in kr_voice_data.values():
            if "repacked" in item:
                zip_path = item.get("zip_path", "")
                is_prologue = (os.path.basename(zip_path) == "11.zip")
                for rep in item["repacked"]:
                    zname = rep.get("zip_name")
                    if zname:
                        repacked_zips[zname] = {
                            "size": rep.get("zip_size"),
                            "crc": rep.get("zip_crc32"),
                            "is_prologue": is_prologue
                        }
            elif "zip_name" in item:
                zname = item.get("zip_name")
                match = re.search(r"Main_(\d+)", str(item.get("ogg_name", "")))
                is_prologue = bool(match and 11000 <= int(match.group(1)) < 11010)
                if zname:
                    existing = repacked_zips.get(zname)
                    if existing:
                        if is_prologue:
                            existing["is_prologue"] = True
                    else:
                        repacked_zips[zname] = {
                            "size": item.get("zip_size"),
                            "crc": item.get("zip_crc32"),
                            "is_prologue": is_prologue
                        }

        for zname, info in repacked_zips.items():
            new_key = f"audio/voc_kr/kr_main/{zname.replace('.zip', '').lower()}"
            table[new_key] = {
                "path": f"GameData/Audio/VOC_KR/{zname}", 
                "FileName": zname,
                "Bytes": info["size"],
                "Crc": info["crc"],
                # "IsPrologue": False,
                "IsPrologue": info["is_prologue"],
                "IsSplitDownload": False, 
                "MediaType": 1
            }

        # OGG合并到zip里了，防VoiceExcel.json路径冲突
#        for item in kr_voice_data.get("Ogg", {}).values():
#            ogg_path = item.get("ogg_path", "")
#            ogg_name = item.get("ogg_name", "")
#            new_key = os.path.splitext(ogg_path)[0].lower()
#            match = re.search(r"Main_(\d+)", str(ogg_name))
#                is_prologue = bool(match and 11000 <= int(match.group(1)) < 11010)

#            table[new_key] = {
#                "path": f"GameData/{ogg_path}", 
#                "FileName": ogg_name,
#                "Bytes": item.get("ogg_size"), 
#                "Crc": item.get("ogg_crc32"),
#                "IsPrologue": is_prologue, 
#                "IsSplitDownload": False, 
#                "MediaType": 2
#            }

    media_data["Table"] = table

    temp_json = work_dir / f"MediaCatalog_{lang}.json"
    with open(temp_json, "w", encoding="utf-8") as f:
        json.dump(media_data, f, indent=4, ensure_ascii=False)
    
    catalog_bytes_dir = Path("Catalog") / lang if lang != "Default" else Path("Catalog")
    catalog_bytes_dir.mkdir(parents=True, exist_ok=True)

    # 打包修改后的MediaCatalog.json
    CatalogMemoryPack(install_dir="tools").run(
        server=server, mode="serialize", catalog_type="Media",
        input_path=str(temp_json), output_path=str((catalog_bytes_dir / "MediaCatalog.bytes").absolute())
    )
    if temp_json.exists(): 
        temp_json.unlink()
