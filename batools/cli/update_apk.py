import argparse
from batools.apktools import ApkTools

def main():
    parser = argparse.ArgumentParser(description="Update Blue Archive APK")
    parser.add_argument("--server", type=str, default="JP", help="服务器选择")
    parser.add_argument("--sdkurl", type=str, default="", help="修改SDK_Url")
    parser.add_argument("--gamemainconfig", type=str, default="", help="修改GameMainConfig")
    parser.add_argument("--modifylogin", action="store_true", help="修改登录界面语言")
    parser.add_argument("--modifygt4", type=str, default="zho", help="修改登录界面语言")
    parser.add_argument("--replace", action="store_true", help="替换资源")
    parser.add_argument("--modifybundle", action="store_true", help="修改bundle资源")
    parser.add_argument("--repo", type=str, default="BA-APKSRC", help="资源文件夹路径")
    parser.add_argument("--trustcert", action="store_true", help="启用信任证书")
    args = parser.parse_args()

    apk_tools = ApkTools(repo=args.repo)
    apk_tools.main(
        sdkurl=args.sdkurl,
        gamemainconfig=args.gamemainconfig,
        trustcert=args.trustcert,
        modifylogin=args.modifylogin,
        modifygt4=args.modifygt4,
        replace=args.replace,
        modifybundle=args.modifybundle,
        server=args.server
    )

if __name__ == "__main__":
    main()
