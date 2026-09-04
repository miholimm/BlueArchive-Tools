import { ArrowDownToLine, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useContent } from "../lib/ContentContext";
import { getResourceStatus, getStatusLabel, getStatusResource } from "../lib/status";
import { trackEvent } from "../lib/tracking";
import SchaleRadar from "./SchaleRadar";

export default function Hero({
  showNews = true,
  showStatus = true,
  showDownloads = true,
}: {
  showNews?: boolean
  showStatus?: boolean
  showDownloads?: boolean
}) {
  const { settings, download, status } = useContent();
  const version =
    download.android[0]?.version || download.windows[0]?.version || "1.0.0";
  const platformCount = Object.values(download).filter(
    (items) => Array.isArray(items) && items.length > 0,
  ).length;
  const textTranslation = getStatusResource("textTranslation", status);
  const translateStatus = textTranslation ? getResourceStatus(textTranslation) : "pending";
  const translateIndicator = translateStatus === "normal"
    ? "SYNCED"
    : translateStatus === "error"
      ? "MISMATCH"
      : "PENDING";
  const titleParts = settings.siteTitle.split("汉化组");
  const titleLead = titleParts[0] || settings.siteTitle;
  const titleTail = titleParts.length > 1 ? "汉化组" : "";

  return (
    <section className="hero">
      <div className="hero-art">
        <div className="hero-grid" />
        <div className="hero-glow" />
        <span className="hero-cloud cloud-1" aria-hidden="true" />
        <span className="hero-cloud cloud-2" aria-hidden="true" />
        <div className="hero-halo" aria-hidden="true">
          <span className="hero-halo-ring" />
          <span className="hero-halo-ring hero-halo-ring-2" />
        </div>
        <img
          className="hero-shiroko"
          src="/images/shiroko-portrait.webp"
          alt="砂狼白子"
          loading="eager"
          decoding="async"
        />
        <div className="hero-particles" aria-hidden="true">
          <span className="spark s1" />
          <span className="spark s2" />
          <span className="spark s3" />
          <span className="spark s4" />
          <span className="spark s5" />
        </div>
        <div className="hero-figure">
          <SchaleRadar status={translateStatus} />
          {showStatus && <div className="figure-card figure-card-main">
            <span>01</span>
            <strong>
              文本汉化
              <br />
              {getStatusLabel(translateStatus)}
            </strong>
            <em>{textTranslation?.resourceVersion || "待配置"}</em>
          </div>}
          {showDownloads && <div className="figure-card figure-card-side figure-card-2">
            <span>02</span>
            <strong>
              官方
              <br />
              版本
            </strong>
            <em>{textTranslation?.officialVersion || "待配置"}</em>
          </div>}
          {showStatus && <div className="figure-card figure-card-side figure-card-3">
            <span>03</span>
            <strong>
              版本
              <br />
              校验
            </strong>
            <em>{translateIndicator}</em>
          </div>}
        </div>
      </div>
      <div className="hero-copy">
        <div className="eyebrow">
          <Sparkles size={14} /> 学园 × 青春 × 物语 RPG
        </div>
        <h1>
          {titleLead}
          <br />
          <em>{titleTail || "本地化计划"}</em>
        </h1>
        <p className="hero-lead">{settings.siteSubtitle}</p>
        <p className="hero-description">
          我们是一群热爱《蔚蓝档案》的玩家，致力于让每一段故事、每一个角色，都能以最自然的中文与你相遇。
        </p>
        <div className="hero-actions">
          {showDownloads && <Link
              to="/download"
              className="button button-primary ripple-btn"
              onClick={() => trackEvent("download_click", { source: "hero" })}
            >
              <ArrowDownToLine size={17} /> 获取资源
            </Link>}
          {showNews && <Link to="/news" className="button button-ghost">
            查看公告 <ArrowRight size={17} />
          </Link>}
        </div>
        <div className="hero-stats">
          {showDownloads && <div>
            <strong>{version}</strong>
            <span>当前汉化版本</span>
          </div>}
          {showStatus && <div>
            <strong>AUTO</strong>
            <span>版本状态校验</span>
          </div>}
          {showDownloads && <div>
            <strong>{platformCount}</strong>
            <span>平台资源</span>
          </div>}
        </div>
        <div className="hero-scroll">
          <span /> 向下探索
        </div>
      </div>
    </section>
  );
}
