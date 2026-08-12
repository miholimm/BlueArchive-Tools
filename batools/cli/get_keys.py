import argparse

def main():
    # 兼容 Extractor.yml 中 `python -m get.get_keys "$SERVER"` 的调用。
    # 原仓库中并不存在该模块，导致 Extractor 步骤在执行到此处时报错退出。
    # 该步骤目前无实际功能需求，保留为无操作占位，使 CI 流程不被中断。
    parser = argparse.ArgumentParser(description="获取密钥（占位无操作）")
    parser.add_argument("server", nargs="?", type=str, default="JP", help="服务器区域")
    parser.parse_args()

if __name__ == "__main__":
    main()
