import os
import sys
import json
import shutil
import hashlib
import subprocess
from pathlib import Path

# Add android build-tools to PATH
build_tools_dir = r"C:\Users\flhan\WorkBuddy\android-sdk\build-tools\34.0.0"
if build_tools_dir not in os.environ.get("PATH", ""):
    os.environ["PATH"] = build_tools_dir + os.pathsep + os.environ.get("PATH", "")

# Ensure working directory is repo root
repo_root = Path(r"C:\Users\flhan\WorkBuddy\tools\BlueArchive-Tools").resolve()
os.chdir(str(repo_root))
sys.path.insert(0, str(repo_root))

from build.build_update import AndroidBuilder

def main():
    print("=== 开始构建蔚蓝档案日服 (JP 1.73.459696) 汉化 APK ===")
    
    # 准备原包
    temp_dir = repo_root / "Temp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    target_apk = temp_dir / "Temp_JP.apk"
    backup_apk = temp_dir / "Original_JP_1.73.459696.apk"
    
    if not target_apk.exists() and backup_apk.exists():
        print("从备份还原 Temp_JP.apk...")
        shutil.copyfile(backup_apk, target_apk)
    
    server_info_url = "https://yostar-serverinfo.bluearchive.help/r96_73_xxwtdfjcpetwmk8mo77q.json"
    sdk_url = "https://jp-sdk-api.bluearchive.help/"
    
    builder = AndroidBuilder(
        repo="BA-APKSRC",
        server="JP",
        workers=1
    )
    
    # 执行全套汉化构建流程
    builder.run(
        sdkurl=sdk_url,
        gamemainconfig=json.dumps({"ServerInfoDataUrl": server_info_url}, separators=(",", ":")),
        trustcert=True,
        modifylogin=True,
        modifygt4="zho",
        replace=True,
        modifybundle=True,
        upload=False
    )
    
    final_apk = repo_root / "蔚蓝档案.apk"
    if not final_apk.exists():
        raise FileNotFoundError(f"构建完成但未找到最终产物: {final_apk}")
        
    print(f"\n[OK] 汉化 APK 构建成功: {final_apk}")
    print(f"大小: {final_apk.stat().st_size} 字节 ({final_apk.stat().st_size / 1024 / 1024:.2f} MB)")

if __name__ == "__main__":
    main()
