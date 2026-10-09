import React, { useEffect, useRef } from "react";
import { Sparkles, Tv, ExternalLink } from "lucide-react";
import { useContent } from "../lib/ContentContext";
import type { GoogleAdsSlots } from "../types";

export interface GoogleAdProps {
  slotKey: keyof GoogleAdsSlots;
  format?: "auto" | "horizontal" | "rectangle" | "vertical";
  label?: string;
  style?: React.CSSProperties;
  className?: string;
  preview?: boolean;
}

const slotLabels: Record<keyof GoogleAdsSlots, { title: string; hint: string }> = {
  homeBanner: {
    title: "首页横幅赞助位",
    hint: "自适应横幅 / 推荐尺寸 728x90 或 970x90",
  },
  downloadBanner: {
    title: "下载专区推荐位",
    hint: "横幅或展示卡片 / 推荐自适应尺寸",
  },
  storyReaderBottom: {
    title: "剧情阅读赞助位",
    hint: "章节底部横幅 / 推荐自适应横幅",
  },
  qaBanner: {
    title: "社区交流赞助位",
    hint: "问答与术语通栏 / 推荐自适应尺寸",
  },
  footerBanner: {
    title: "页脚全站赞助位",
    hint: "页脚上方通栏 / 推荐全宽响应式",
  },
};

export default function GoogleAd({
  slotKey,
  format = "auto",
  label,
  style,
  className = "",
  preview = false,
}: GoogleAdProps) {
  const { settings } = useContent();
  const ads = settings.ads;
  const insRef = useRef<HTMLModElement | null>(null);

  const isEnabled = Boolean(ads?.enabled);
  const clientId = ads?.clientId?.trim() || "";
  const slotId = ads?.slots?.[slotKey]?.trim() || "";
  const testMode = Boolean(ads?.testMode);
  const showPlaceholder = preview || Boolean(ads?.showPlaceholder);

  // 动态注入 Google AdSense 脚本
  useEffect(() => {
    if (!isEnabled || !clientId) return;
    const scriptId = "google-adsense-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }
  }, [isEnabled, clientId]);

  // 广告渲染时触发 adsbygoogle push
  useEffect(() => {
    if (!isEnabled || !clientId) return;
    if (!insRef.current) return;
    try {
      const windowWithAds = window as unknown as { adsbygoogle?: unknown[] };
      windowWithAds.adsbygoogle = windowWithAds.adsbygoogle || [];
      windowWithAds.adsbygoogle.push({});
    } catch (e) {
      // 忽略因重复 push 或广告拦截器产生的非致命错误
      console.debug("adsbygoogle push status:", e);
    }
  }, [isEnabled, clientId, slotId]);

  const slotInfo = slotLabels[slotKey] || {
    title: label || "赞助广告位",
    hint: "自适应广告单元",
  };

  // 1. 如果已启用广告并且填写了发布商 ID
  if (isEnabled && clientId) {
    return (
      <div
        className={`google-ad-container ${className}`}
        style={{
          margin: "24px auto",
          width: "100%",
          maxWidth: "1100px",
          borderRadius: "var(--radius-md, 16px)",
          overflow: "hidden",
          textAlign: "center",
          ...style,
        }}
      >
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{
            display: "block",
            borderRadius: "var(--radius-md, 16px)",
            minHeight: "90px",
          }}
          data-ad-client={clientId}
          {...(slotId ? { "data-ad-slot": slotId } : {})}
          data-ad-format={format}
          data-full-width-responsive="true"
          {...(testMode ? { "data-ad-test": "on" } : {})}
        />
      </div>
    );
  }

  // 2. 如果未启用真实广告，但开启了「预留位占位展示」（或处于预览状态）
  if (showPlaceholder) {
    return (
      <div
        className={`google-ad-placeholder ${className}`}
        style={{
          margin: "24px auto",
          width: "100%",
          maxWidth: "1100px",
          padding: "16px 20px",
          borderRadius: "var(--radius-md, 16px)",
          border: "1.5px dashed var(--cyan-border, rgba(6,182,212,0.3))",
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(240,249,255,0.6) 100%)",
          backdropFilter: "blur(10px)",
          boxShadow: "var(--shadow-sm, 0 2px 12px rgba(0,0,0,0.04))",
          boxSizing: "border-box",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          textAlign: "center",
          ...style,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 10px",
              borderRadius: "9999px",
              background: "rgba(6,182,212,0.12)",
              color: "var(--cyan-strong, #0891b2)",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.5px",
            }}
          >
            <Tv size={13} />
            <span>GOOGLE ADS 预留广告位</span>
          </span>

          <span
            style={{
              padding: "2px 8px",
              borderRadius: "9999px",
              background: "rgba(100,116,139,0.1)",
              color: "var(--ink-dim, #64748b)",
              fontSize: "11px",
              fontWeight: 600,
              fontFamily: "monospace",
            }}
          >
            [{slotKey}]
          </span>

          <span
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--ink, #0f172a)",
            }}
          >
            {label || slotInfo.title}
          </span>
        </div>

        <p
          style={{
            margin: "2px 0 0",
            fontSize: "12px",
            color: "var(--ink-dim, #64748b)",
            lineHeight: 1.5,
          }}
        >
          {slotInfo.hint} · 此处已预留广告容器，管理员在后台填入发布商 ID
          后将自动呈现自适应广告。
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            color: "var(--cyan-strong, #0891b2)",
            opacity: 0.85,
            marginTop: "2px",
          }}
        >
          <Sparkles size={12} />
          <span>预留位预览模式 · 不影响正文交互与布局排版</span>
        </div>
      </div>
    );
  }

  // 3. 广告未开启且未勾选预留位显示，纯静默留空
  return null;
}
