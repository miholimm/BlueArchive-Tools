"""batools — BlueArchive 资源提取 / 解包工具集（重构后的显式包）。

本包由原本散落在仓库根目录、``lib/``、``utils/``、``xtractor/`` 下的扁平脚本
重构而来。所有模块统一使用绝对导入 ``batools.*``，消除脆弱的相对前缀
（``lib.`` / ``utils.`` / ``xtractor.``）。

模块职责一览（更完整的重构对照见仓库根目录 ``REFACTOR_OVERVIEW.md``）：

==========  ==========  ==================================================
分组        模块         职责
==========  ==========  ==================================================
配置        config      全局配置：线程数、服务器、代理、环境变量路径
文件        filesystem  文件 / 目录查找
命令        command     外部命令封装（统一 ``(成功, 输出)`` 返回）
并发        concurrency 模板字符串、名称工具、线程池任务管理
归档        archive     zip 读写
归档        asar        asar 归档解包 / 打包
工具        tool        外部 CLI 工具下载 / 管理
网络        downloader  HTTP 下载器
终端        console     终端输出 / 通知
结构        structure   数据库 / 编译器相关的数据结构（dataclass）
加密        encryption  加解密、字符串转换、Mersenne 随机数
服务器      regions     各服务器（JP / GL / CN / JPPC）端点与配置解析
APK         apktools    APK 解包 / 重打包
数据库      database    SQLite 写入
转储        dumper      资源转储
编译        compiler    资源编译（最大模块）
提取        extraction  Unity 资源（bundle / catalog / table）提取
语音        voice       语音资源提取 / 构建
表格        excel       Excel 处理
入口        cli         命令行入口（get_keys / get_catalog / get_files /
                          update / update_apk）
==========  ==========  ==================================================

公共 API
--------
下方的 ``__all__`` 仅重新导出**零依赖**（仅依赖标准库）的符号，保证
``import batools`` 在最小环境下也能成功。需要使用可选第三方依赖的模块
（``encryption``、``regions``、``compiler``、``extraction.*`` 等）请在调用处
显式 ``from batools.<module> import <Symbol>``。
"""

from batools.config import Config
from batools.filesystem import FileUtils
from batools.command import CommandUtils
from batools.concurrency import Utils, TemplateString, TaskManager

__all__ = [
    "Config",
    "FileUtils",
    "CommandUtils",
    "Utils",
    "TemplateString",
    "TaskManager",
]
