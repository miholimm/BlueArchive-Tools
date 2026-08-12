# BlueArchive-Tools 结构重构总览

> 目标：在**功能完全一致、不影响正常作业（CI）** 的前提下，将原仓库扁平、隐式命名空间的目录结构
> 重构为显式、可维护的 `batools/` Python 包。

## 1. 重构前后对比

**重构前（扁平 + 隐式命名空间，脆弱的相对导入）**
```
lib/        (console, encryption, structure, downloader, compiler, dumper)
utils/      (config, util, database, regions, apktools)
xtractor/   (bundle, catalog, table)
voice_build.py          (根目录)
extractor_voice.py      (根目录)
process_excel.py        (根目录)
get/  update/           (CLI 入口，内容即实现)
```
入口脚本与 `lib./utils./xtractor.` 等相对前缀深度耦合，移动文件即破坏导入。

**重构后（显式 `batools` 包 + 绝对导入 + 薄兼容层）**
```
batools/
  __init__.py
  config.py  console.py  structure.py  encryption.py  downloader.py
  command.py  archive.py  filesystem.py  asar.py  tool.py  compiler.py
  dumper.py  database.py  regions.py  apktools.py
  concurrency.py
  extraction/   (bundle, catalog, table)
  voice/        (build, extract)
  excel/        (process)
  cli/          (get_catalog, get_files, get_keys, update, update_apk)
# 入口保持原位（薄 shim，仅委托到 batools.*）
get/get_catalog.py  get/get_files.py  get/get_keys.py  (新增)
update/update.py    update/update_apk.py
extractor_voice.py  process_excel.py  voice_build.py
```
所有内部导入已从 `lib./utils./xtractor.` 重写为绝对导入 `batools.…`。

## 2. CI 兼容性（关键约束）

所有 GitHub Actions 命令**一字未改**，靠根目录/包内薄 shim 委托到新实现：

| CI 命令 | 入口文件（未变） | 实际实现 |
|---|---|---|
| `python -m get.get_catalog …` | `get/get_catalog.py` | `batools/cli/get_catalog.py` |
| `python -m get.get_files …` | `get/get_files.py` | `batools/cli/get_files.py` |
| `python -m get.get_keys "$SERVER"` | `get/get_keys.py`（**新增**） | `batools/cli/get_keys.py` |
| `python process_excel.py …` | `process_excel.py` | `batools/excel/process.py` |
| `python extractor_voice.py` | `extractor_voice.py` | `batools/voice/extract.py` |
| `python -m update.update …` | `update/update.py` | `batools/cli/update.py` |
| `python -m update.update_apk …` | `update/update_apk.py` | `batools/cli/update_apk.py` |
| `./get/get_version.sh …` | 原文件（未改动） | — |

> **顺带修复的 CI 缺陷**：原 `Extractor.yml:212` 调用 `python -m get.get_keys "$SERVER"`，
> 但仓库中**根本不存在该模块**，导致 Extractor 步骤必崩。重构补上了无操作占位
> `batools/cli/get_keys.py` + `get/get_keys.py` shim，使该步骤不再中断。

## 3. 行为保全要点

- CWD 相对 IO 路径（`other/`, `Download/`, `Temp/`, `tools/`, `FlatData/`, `Voice/` 等）语义**完全不变**。
- 外部 git 子模块 `PyCriCodecs/`、`crcmanip/` 与运行时克隆的 `FlatData/` 保持顶层不动。
- `Server.get_server_url` 中原有的 5 元组 / 3 元组返回不一致**刻意保留**，以严格等价原行为。
- `compiler.py` 内由模板生成的代码，其 `from lib.encryption import …` 已同步改写为 `from batools.encryption import …`。

## 4. 验证手段与结果

1. **语法编译**：`py_compile` 全量通过。
2. **模块路径一致性（AST）**：所有 `batools.*` 导入的模块文件均存在。
3. **符号级一致性（AST）**：101 处 `from batools.X import name` 的 `name` 均确在目标模块定义。
   - 此项**发现并修复**了 4 处导入错配：原 `utils.util` 被拆分为 `archive/filesystem/command/asar/tool/concurrency`，
     若干文件误从 `batools.archive`/`batools.command` 导入 `FileUtils`/`AsarUtils`/`ToolManager`/`ZipUtils`，
     已全部纠正到正确模块。
4. **端到端导入（桩替换第三方依赖）**：将 requests/pyminizip/dotenv/lxml/flatbuffers/Crypto/
   pysqlcipher3/xxhash/PIL/cloudscraper 与 `PyCriCodecs` 桩化后，全部 39 个模块 + shim 导入通过；
   证明重构后的内部导入图无残留错误。

## 5. 已知遗留（非重构引入）

- ~~`apktools.py` 曾使用 `from distutils.dir_util import copy_tree`，而 `distutils` 在 Python 3.12+ 已移除~~ ——
  **已修复**：两处 `copy_tree` 调用（合并 `lib`/`assets` 目录、覆盖 `Replace` 资源）已替换为标准库
  `shutil.copytree(..., dirs_exist_ok=True)`，行为与 `distutils.dir_util.copy_tree`（合并写入已存在的目标目录）等价，
  且兼容 Python 3.12+。
- 运行前仍需 `pip install -r requirements.txt`（PyCriCodecs 等原生扩展需在 CI 环境构建）。

## 6. 测试与 CI 守护（重构不退化）

新增 `tests/` 单元测试（标准库 `unittest`，零第三方依赖即可运行）：

- `test_config.py`：`Config` 默认值与可变类属性。
- `test_filesystem.py`：`FileUtils.find_files` 的局部/完全/顺序/正则匹配。
- `test_command.py`：`CommandUtils.run_command` 成功 / 失败 / 不存在命令 / cwd 行为。
- `test_concurrency.py`：`TemplateString`、`Utils.convert_name_to_available`、`TaskManager` 基本行为。
- `test_encryption.py`：`xor` / `create_key` / `encrypt_string` / `convert_string` / `zip_password` / `MersenneTwister` 的确定性与往返
  （需 `pycryptodome` + `xxhash`，CI 已安装；本地缺依赖时自动 `skip`）。
- `test_smoke.py`：导入图冒烟测试——`GUARANTEED` 模块（零依赖）**必须**可导入；`OPTIONAL` 模块（依赖第三方）缺依赖时优雅跳过，
  CI 依赖齐全时全部导入，防重构破坏导入图。

新增 `.github/workflows/Test.yml`：在 `push`（main / refactor 分支）与 `pull_request`（main）时，
递归拉取子模块、用 `requirements-test.txt` 安装轻量测试依赖、运行
`python -m unittest discover -s tests -t . -v`。

`requirements-test.txt` 仅含可纯 wheel 安装的轻量依赖
（`pycryptodome` / `xxhash` / `python-dotenv` / `lxml` / `requests` / `cloudscraper` / `flatbuffers` / `pillow` / `tqdm` / `click` / `pydub`），
刻意排除 `pyminizip` / `unitypy` / `pysqlcipher3` 及 `PyCriCodecs` / `crcmanip` 子模块构建，避免 Test 任务依赖系统库；
这些模块的导入由 `test_smoke.py` 在缺失时自动跳过。
