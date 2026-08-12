# 向后兼容 shim —— 实际实现已迁移至 batools/voice/build.py
from batools.voice.build import (
    update_voice_excel_cn,
    update_voice_excel_kr,
    update_media_catalog,
)

__all__ = [
    "update_voice_excel_cn",
    "update_voice_excel_kr",
    "update_media_catalog",
]
