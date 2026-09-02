import {
  CheckCircle2,
  ClipboardCheck,
  FolderOpen,
  HardDrive,
  MonitorCog,
  ShieldCheck,
  Smartphone,
  Usb,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { DownloadData } from "../types";

type Platform = keyof DownloadData;

const guides: Record<Platform, Array<{ title: string; detail: string; icon: typeof Smartphone }>> = {
  android: [
    { title: "下载 APK", detail: "选择与你设备架构匹配的汉化客户端或资源下载器。", icon: Smartphone },
    { title: "完成授权", detail: "在系统安装页确认来源，并保留足够的设备存储空间。", icon: ShieldCheck },
    { title: "启动校验", detail: "首次启动完成资源校验后，再进入游戏主界面。", icon: CheckCircle2 },
  ],
  windows: [
    { title: "选择渠道", detail: "根据你的 DMM 或 Steam 客户端选择对应的 PC 补丁。", icon: MonitorCog },
    { title: "定位目录", detail: "将补丁解压到游戏安装目录，避免和旧版文件混用。", icon: FolderOpen },
    { title: "启动确认", detail: "完成版本检测后，从原游戏入口启动并检查标题画面。", icon: CheckCircle2 },
  ],
  ios: [
    { title: "获取安装包", detail: "选择已签名的 iOS 资源方案，并确认设备系统版本。", icon: Smartphone },
    { title: "信任描述文件", detail: "在系统设置中完成开发者或描述文件信任。", icon: ShieldCheck },
    { title: "启动校验", detail: "首次打开后等待资源同步完成，再进入游戏。", icon: CheckCircle2 },
  ],
  macos: [
    { title: "下载客户端", detail: "选择适用于 Apple Silicon 或 Intel 的对应构建。", icon: MonitorCog },
    { title: "放置补丁", detail: "按安装说明选择游戏包或兼容容器目录。", icon: FolderOpen },
    { title: "确认权限", detail: "在系统隐私与安全设置中确认应用可运行。", icon: CheckCircle2 },
  ],
};

function platformLabel(platform: Platform) {
  if (platform === "android") return "Android APK";
  if (platform === "windows") return "PC PATCH / DMM / STEAM";
  if (platform === "ios") return "iOS SIDELOAD";
  return "macOS CLIENT";
}

function platformDetail(platform: Platform) {
  if (platform === "android") return "设备端安装与资源下载";
  if (platform === "windows") return "DMM / Steam 桌面补丁";
  if (platform === "ios") return "签名与侧载方案";
  return "Apple Silicon / Intel";
}

export function InstallGuide({ platform }: { platform: Platform }) {
  return (
    <section className="install-guide" aria-labelledby="install-guide-title">
      <header className="install-guide-header">
        <div>
          <span className="install-guide-kicker">INSTALL FLOW / {platformLabel(platform)}</span>
          <h2 id="install-guide-title">三步完成部署</h2>
        </div>
        <span className="status-tech-label">{platformDetail(platform)}</span>
      </header>
      <div className="install-guide-flow">
        {guides[platform].map((step, index) => {
          const Icon = step.icon;
          return (
            <article className="install-guide-step" key={step.title}>
              <span className="install-guide-step-index">0{index + 1}</span>
              <Icon size={25} />
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

type UsbBridge = {
  getDevices: () => Promise<unknown[]>;
  requestDevice: (options: { filters: unknown[] }) => Promise<unknown>;
};

function getUsbBridge() {
  return (navigator as Navigator & { usb?: UsbBridge }).usb;
}

export function EnvironmentCheck({ platform }: { platform: Platform }) {
  const [storage, setStorage] = useState<string>("正在检测");
  const [usbCount, setUsbCount] = useState<number | null>(null);
  const [usbMessage, setUsbMessage] = useState("尚未请求设备授权");

  useEffect(() => {
    let active = true;
    navigator.storage?.estimate()
      .then((estimate) => {
        if (!active) return;
        const available = Math.max(0, (estimate.quota || 0) - (estimate.usage || 0));
        setStorage(available ? `${Math.round(available / 1024 / 1024)} MB 可用` : "浏览器未提供容量数据");
      })
      .catch(() => {
        if (active) setStorage("浏览器未提供容量数据");
      });
    const bridge = getUsbBridge();
    if (bridge) {
      bridge.getDevices()
        .then((devices) => {
          if (active) setUsbCount(devices.length);
        })
        .catch(() => {
          if (active) setUsbCount(null);
        });
    }
    return () => {
      active = false;
    };
  }, [platform]);

  const requestUsb = async () => {
    const bridge = getUsbBridge();
    if (!bridge) {
      setUsbMessage("当前浏览器不支持 Web-USB，请使用 Chromium 浏览器。");
      return;
    }
    try {
      await bridge.requestDevice({ filters: [] });
      const devices = await bridge.getDevices();
      setUsbCount(devices.length);
      setUsbMessage("设备接口已授权，仅用于连接检测，不会写入游戏文件。");
    } catch {
      setUsbMessage("未选择设备，或浏览器拒绝了本次连接请求。");
    }
  };

  const secure = window.isSecureContext;
  const usbSupported = Boolean(getUsbBridge());
  const supportsUsb = platform === "android";

  return (
    <aside className="environment-check" aria-live="polite">
      <header className="environment-check-header">
        <div>
          <span className="env-check-kicker">PATCH ASSISTANT / READ ONLY</span>
          <h3>一键环境自检</h3>
        </div>
        {supportsUsb && (
          <button type="button" className="button button-ghost" onClick={requestUsb}>
            <Usb size={16} /> 检测 USB 连接
          </button>
        )}
      </header>
      <div className="environment-check-results">
        <div className={`env-check-item ${secure ? "is-ok" : "is-warn"}`}>
          <span>安全上下文</span>
          <strong>{secure ? <CheckCircle2 size={14} /> : <XCircle size={14} />}{secure ? "HTTPS 已启用" : "需要 HTTPS"}</strong>
        </div>
        <div className={`env-check-item ${storage.includes("可用") ? "is-ok" : "is-warn"}`}>
          <span>浏览器存储</span>
          <strong><HardDrive size={14} />{storage}</strong>
        </div>
        <div className={`env-check-item ${usbSupported ? "is-ok" : "is-warn"}`}>
          <span>Web-USB</span>
          <strong><Usb size={14} />{usbSupported ? "浏览器支持" : "不可用"}</strong>
        </div>
        <div className={`env-check-item ${usbCount && usbCount > 0 ? "is-ok" : "is-warn"}`}>
          <span>已授权设备</span>
          <strong><ClipboardCheck size={14} />{usbCount === null ? "未检测" : `${usbCount} 台`}</strong>
        </div>
      </div>
      <div className="env-check-actions">
        <span className="env-check-note">{supportsUsb ? usbMessage : "桌面补丁请使用本页的三步安装说明，不会由浏览器直接访问本地游戏目录。"}</span>
      </div>
    </aside>
  );
}
