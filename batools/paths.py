"""集中管理工作目录相对路径常量。

原仓库中这些目录名以字符串字面量散落在 12+ 个文件里，
改一次路径（比如把 ``Download`` 改个名）要同步改多处。

统一放这里后，**改路径只需动本文件一个地方**，其余代码引用常量即可。
所有值保持与原行为完全一致（均为 CWD 相对路径），不引入任何抽象封装。
"""

# ---------------------------------------------------------------------------
# 目录（CWD 相对）
# ---------------------------------------------------------------------------
OTHER_DIR = "other"                 # env 文件 / voice.json / repack_config.json
DOWNLOAD_DIR = "Download"           # 下载缓存：catalog / bundle / table
TEMP_DIR = "Temp"                   # 临时解包目录
VOICE_DIR = "Voice"                 # 语音资源输出目录
TOOLS_DIR = "tools"                 # 外部 CLI 工具安装目录（install_dir）
EXTRACTED_DIR = "Extracted"         # bundle 提取输出目录
DUMPS_DIR = "Dumps"                 # IL2CPP dump 输出目录
REPLACE_DIR = "Replace"             # APK 覆盖资源目录
TABLE_BUNDLES_DIR = "BA-TableBundles"  # 表 bundle 根目录

# ---------------------------------------------------------------------------
# 模块 / 文件名
# ---------------------------------------------------------------------------
FLAT_DATA_MODULE = "FlatData"       # 生成的 FlatData 模块名
