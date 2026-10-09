import React, { useEffect, useState } from "react";
import {
  Tv,
  Save,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  HelpCircle,
  FileText,
  Layers,
  Settings2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { authFetch } from "../lib/api";
import type { GoogleAdsConfig, GoogleAdsSlots } from "../types";
import GoogleAd from "./GoogleAd";

interface AdminAdsTabProps {
  notify: (message: string, type?: "success" | "error") => void;
  refreshContent: () => Promise<void>;
}

const defaultAdsConfig: GoogleAdsConfig = {
  enabled: false,
  clientId: "",
  autoAds: false,
  testMode: true,
  showPlaceholder: true,
  adsTxt: "",
  slots: {
    homeBanner: "",
    downloadBanner: "",
    storyReaderBottom: "",
    qaBanner: "",
    footerBanner: "",
  },
};

const slotDefinitions: {
  key: keyof GoogleAdsSlots;
  name: string;
  location: string;
  recommend: string;
}[] = [
  {
    key: "homeBanner",
    name: "首页底部横幅",
    location: "网站首页内容区域末尾、城区导览卡片下方",
    recommend: "自适应横幅 / 728x90、970x90",
  },
  {
    key: "downloadBanner",
    name: "资源下载页横幅",
    location: "下载平台列表下方、安装引导之间",
    recommend: "自适应展示广告 / 728x90",
  },
  {
    key: "storyReaderBottom",
    name: "剧情阅读器底部",
    location: "章节阅读界面对白列表末尾、段落切换上方",
    recommend: "自适应横幅 / 728x90",
  },
  {
    key: "qaBanner",
    name: "问答与术语通栏",
    location: "问答列表底部及术语库搜索下方",
    recommend: "自适应横幅 / 728x90",
  },
  {
    key: "footerBanner",
    name: "全站页脚通栏",
    location: "全站底部 Footer 导航栏上方全宽横幅",
    recommend: "全宽自适应通栏 / 970x90 或 970x250",
  },
];

export default function AdminAdsTab({ notify, refreshContent }: AdminAdsTabProps) {
  const [config, setConfig] = useState<GoogleAdsConfig>(defaultAdsConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState<keyof GoogleAdsSlots>("homeBanner");

  useEffect(() => {
    let active = true;
    authFetch("/api/admin/ads")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setConfig({
          enabled: Boolean(data.enabled),
          clientId: data.clientId || "",
          autoAds: Boolean(data.autoAds),
          testMode: data.testMode !== undefined ? Boolean(data.testMode) : true,
          showPlaceholder:
            data.showPlaceholder !== undefined ? Boolean(data.showPlaceholder) : true,
          adsTxt: data.adsTxt || "",
          slots: {
            homeBanner: data.slots?.homeBanner || "",
            downloadBanner: data.slots?.downloadBanner || "",
            storyReaderBottom: data.slots?.storyReaderBottom || "",
            qaBanner: data.slots?.qaBanner || "",
            footerBanner: data.slots?.footerBanner || "",
          },
        });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "保存失败");
      }
      await refreshContent().catch(() => {});
      notify("广告预留与配置已成功保存！");
    } catch (e) {
      notify(e instanceof Error ? e.message : "保存广告配置失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const cleanPub = (config.clientId || "").replace(/^ca-/, "").trim();
  const autoAdsTxt = cleanPub
    ? `google.com, ${cleanPub}, DIRECT, f08c47fec0942fa0`
    : "# 填入发布商 ID 后系统将自动在此生成标准 ads.txt";

  if (loading) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ink-dim)" }}>
        <p>正在读取广告配置...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 顶部标题栏 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          padding: "20px 24px",
          borderRadius: "18px",
          background: "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(240,249,255,0.7) 100%)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--border-subtle, rgba(0,0,0,0.06))",
          boxShadow: "var(--shadow-sm, 0 2px 12px rgba(0,0,0,0.04))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              background: "rgba(6,182,212,0.12)",
              color: "var(--cyan-strong, #0891b2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Tv size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
              Google Ads 广告管理与预留配置
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--ink-dim, #64748b)" }}>
              提供 Google AdSense 规范接入、自动广告、全站 5 大关键预留广告单元及 ads.txt 自动托管
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="button button-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            borderRadius: "9999px",
            padding: "10px 22px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          <Save size={16} />
          <span>{saving ? "正在保存..." : "保存广告配置"}</span>
        </button>
      </div>

      {/* 第一分区：核心配置与开关 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
        }}
      >
        {/* 左卡片：发布商信息与总开关 */}
        <div
          style={{
            padding: "24px",
            borderRadius: "18px",
            background: "rgba(255,255,255,0.75)",
            border: "1px solid var(--border-subtle, rgba(0,0,0,0.06))",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Settings2 size={18} style={{ color: "var(--cyan-strong, #0891b2)" }} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>发布商基础信息</h3>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink-soft)" }}>
              Google 发布商 ID (Publisher ID / Client ID)
            </span>
            <input
              type="text"
              placeholder="例如：ca-pub-1234567890123456"
              value={config.clientId}
              onChange={(e) => setConfig({ ...config, clientId: e.target.value.trim() })}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1px solid var(--border-subtle, rgba(0,0,0,0.12))",
                background: "var(--glass-input, rgba(255,255,255,0.8))",
                fontSize: "14px",
                color: "var(--ink)",
                fontFamily: "monospace",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <small style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
              从 Google AdSense 控制台获取（格式通常为 <code>ca-pub-XXXXXXXXXXXXXXXX</code>）
            </small>
          </label>

          {/* 开关矩阵 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "4px" }}>
            {/* 全局广告总开关 */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: "14px",
                background: config.enabled ? "rgba(6,182,212,0.08)" : "rgba(0,0,0,0.02)",
                border: config.enabled
                  ? "1px solid rgba(6,182,212,0.3)"
                  : "1px solid var(--border-subtle)",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "14px", display: "block" }}>启用 Google 广告</strong>
                <span style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
                  开启后向访客加载 Google AdSense 脚本与广告展示
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
            </label>

            {/* 自动广告开关 */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: "14px",
                background: "rgba(0,0,0,0.02)",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "14px", display: "block" }}>
                  Google 自动广告 (Auto Ads)
                </strong>
                <span style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
                  允许 Google 机器学习智能探测版面并在合适区域展示插页或锚定广告
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.autoAds}
                onChange={(e) => setConfig({ ...config, autoAds: e.target.checked })}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
            </label>

            {/* 测试模式开关 */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: "14px",
                background: "rgba(0,0,0,0.02)",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "14px", display: "block" }}>
                  测试模式 (data-ad-test)
                </strong>
                <span style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
                  仅展示测试广告，可有效防止站长在开发和调试时意外触发无效点击惩罚
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.testMode}
                onChange={(e) => setConfig({ ...config, testMode: e.target.checked })}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
            </label>

            {/* 预留位提示开关 */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: "14px",
                background: config.showPlaceholder ? "rgba(16,185,129,0.08)" : "rgba(0,0,0,0.02)",
                border: config.showPlaceholder
                  ? "1px solid rgba(16,185,129,0.3)"
                  : "1px solid var(--border-subtle)",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "14px", display: "block" }}>
                  前台展示预留位占位提示
                </strong>
                <span style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
                  未配置真实广告时，在前台显示蔚蓝档案风格的预留广告位卡片以方便排版对齐
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.showPlaceholder}
                onChange={(e) => setConfig({ ...config, showPlaceholder: e.target.checked })}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
            </label>
          </div>
        </div>

        {/* 右卡片：ads.txt 自动托管与说明 */}
        <div
          style={{
            padding: "24px",
            borderRadius: "18px",
            background: "rgba(255,255,255,0.75)",
            border: "1px solid var(--border-subtle, rgba(0,0,0,0.06))",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={18} style={{ color: "var(--cyan-strong, #0891b2)" }} />
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>ads.txt 自动托管</h3>
            </div>
            <a
              href="/ads.txt"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                color: "var(--cyan-strong, #0891b2)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              <span>在线访问 /ads.txt</span>
              <ExternalLink size={13} />
            </a>
          </div>

          <div
            style={{
              padding: "12px 14px",
              borderRadius: "12px",
              background: "rgba(6,182,212,0.06)",
              border: "1px solid rgba(6,182,212,0.2)",
              fontSize: "12px",
              lineHeight: 1.6,
              color: "var(--ink-soft)",
            }}
          >
            Google AdSense 审查通过要求在网站根目录下托管 <code>ads.txt</code>
            。系统已原生实现自动解析：当您填入发布商 ID 后，访问 <code>/ads.txt</code>{" "}
            即会自动输出标准的授权记录。
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink-soft)" }}>
              自定义 ads.txt 内容（留空则根据发布商 ID 自动生成）
            </span>
            <textarea
              rows={4}
              placeholder={autoAdsTxt}
              value={config.adsTxt}
              onChange={(e) => setConfig({ ...config, adsTxt: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1px solid var(--border-subtle, rgba(0,0,0,0.12))",
                background: "var(--glass-input, rgba(255,255,255,0.8))",
                fontSize: "13px",
                fontFamily: "monospace",
                color: "var(--ink)",
                outline: "none",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </label>

          <div
            style={{
              padding: "12px 14px",
              borderRadius: "12px",
              background: "rgba(0,0,0,0.02)",
              border: "1px solid var(--border-subtle)",
              fontSize: "12px",
              color: "var(--ink-dim)",
              lineHeight: 1.5,
            }}
          >
            <strong>当前有效输出预览：</strong>
            <pre
              style={{
                margin: "6px 0 0",
                padding: "8px 10px",
                borderRadius: "8px",
                background: "rgba(0,0,0,0.04)",
                fontFamily: "monospace",
                fontSize: "12px",
                whiteSpace: "pre-wrap",
                color: "var(--ink)",
              }}
            >
              {config.adsTxt ? config.adsTxt.trim() : autoAdsTxt}
            </pre>
          </div>
        </div>
      </div>

      {/* 第二分区：各页面预留广告单元配置 */}
      <div
        style={{
          padding: "24px",
          borderRadius: "18px",
          background: "rgba(255,255,255,0.75)",
          border: "1px solid var(--border-subtle, rgba(0,0,0,0.06))",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Layers size={18} style={{ color: "var(--cyan-strong, #0891b2)" }} />
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
            各页面预留广告单元 (Ad Unit Slots)
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--ink-dim)" }}>
          针对网站重要页面分别预留的独立广告单元。在 Google AdSense 后台创建「展示广告单元」后，将
          10 位数字的 <code>data-ad-slot</code> 填入对应位置即可精准投放。
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "16px",
          }}
        >
          {slotDefinitions.map((def) => {
            const val = config.slots[def.key] || "";
            return (
              <div
                key={def.key}
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.6)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "14px", color: "var(--ink)" }}>{def.name}</strong>
                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "monospace",
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      background: "rgba(6,182,212,0.1)",
                      color: "var(--cyan-strong, #0891b2)",
                      fontWeight: 600,
                    }}
                  >
                    {def.key}
                  </span>
                </div>

                <div style={{ fontSize: "12px", color: "var(--ink-dim)", lineHeight: 1.4 }}>
                  <div>
                    <strong>位置：</strong>
                    {def.location}
                  </div>
                  <div style={{ marginTop: "2px" }}>
                    <strong>建议：</strong>
                    {def.recommend}
                  </div>
                </div>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink-soft)" }}>
                    广告单元 ID (data-ad-slot)
                  </span>
                  <input
                    type="text"
                    placeholder="例如：9876543210 (可选)"
                    value={val}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        slots: {
                          ...config.slots,
                          [def.key]: e.target.value.trim(),
                        },
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--glass-input, rgba(255,255,255,0.9))",
                      fontSize: "13px",
                      fontFamily: "monospace",
                      color: "var(--ink)",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* 第三分区：预留位实时版面效果预览 */}
      <div
        style={{
          padding: "24px",
          borderRadius: "18px",
          background: "rgba(255,255,255,0.75)",
          border: "1px solid var(--border-subtle, rgba(0,0,0,0.06))",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Eye size={18} style={{ color: "var(--cyan-strong, #0891b2)" }} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
              预留广告位前台效果实时预览
            </h3>
          </div>
          <span style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
            点击切换查看不同页面的预留位展示形态
          </span>
        </div>

        {/* 预览切换选项卡 */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {slotDefinitions.map((def) => {
            const active = previewTab === def.key;
            return (
              <button
                key={def.key}
                type="button"
                onClick={() => setPreviewTab(def.key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  border: active ? "1px solid var(--cyan-strong, #0891b2)" : "1px solid var(--border-subtle)",
                  background: active ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.6)",
                  color: active ? "var(--cyan-strong, #0891b2)" : "var(--ink-dim)",
                  fontWeight: active ? 700 : 500,
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                }}
              >
                {def.name}
              </button>
            );
          })}
        </div>

        {/* 预览展示区域 */}
        <div
          style={{
            padding: "20px",
            borderRadius: "14px",
            background: "rgba(0,0,0,0.02)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <GoogleAd slotKey={previewTab} preview={true} />
        </div>
      </div>
    </div>
  );
}
