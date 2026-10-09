import { useState } from "react";
import { ArrowDownToLine, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useContent } from "../lib/ContentContext";
import { getResourceStatus, getStatusLabel, getStatusResource } from "../lib/status";
import { trackEvent } from "../lib/tracking";
import SchaleRadar from "./SchaleRadar";

export interface HeroStudentConfig {
  id: string;
  name: string;
  jp: string;
  school: string;
  schoolEn: string;
  portrait: string;
  avatar: string;
  themeColor: string;
  glowColor: string;
  tag: string;
  quotes: string[];
}

export const HERO_STUDENTS: HeroStudentConfig[] = [
  {
    id: "hanako",
    name: "浦和花子",
    jp: "ハナコ（水着）",
    school: "崔尼蒂综合学园",
    schoolEn: "TRINITY GENERAL SCHOOL",
    portrait: "/images/hanako-swimsuit-portrait.webp",
    avatar: "/images/portraits/10074.webp",
    themeColor: "#ff5c8a",
    glowColor: "rgba(255, 92, 138, 0.4)",
    tag: "补课部 · 浦和花子 (水着)",
    quotes: [
      "“在海边毫无防备的样子……老师也想看吗？♡”",
      "“如果是老师的话……稍微恶作剧一下也没关系哦？”",
      "“今天的工作辛苦了。要不要和花子一起吹吹海风？”",
      "“呼呼……老师的视线，好像一直停留在我身上呢♡”",
    ],
  },
  {
    id: "shiroko",
    name: "砂狼白子",
    jp: "シロコ",
    school: "阿拜多斯高中",
    schoolEn: "ABYDOS HIGH SCHOOL",
    portrait: "/images/shiroko-portrait.webp",
    avatar: "/images/portraits/10010.webp",
    themeColor: "#0096e6",
    glowColor: "rgba(0, 150, 230, 0.4)",
    tag: "对策委员会 · 砂狼白子",
    quotes: [
      "“目标确认。老师，今天也一起执行计划吧。”",
      "“无论何时，只要老师需要，我随时准备出发。”",
      "“晨跑的时间到了……嗯，慢慢来也可以的，老师。”",
      "“夏莱的工作……只要有老师在，我就充满干劲。”",
    ],
  },
];

export default function Hero({
  showNews = true,
  showStatus = true,
  showDownloads = true,
}: {
  showNews?: boolean;
  showStatus?: boolean;
  showDownloads?: boolean;
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

  // 看板娘切换状态（默认花子）
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    try {
      return localStorage.getItem("ba_hero_student") || "hanako";
    } catch {
      return "hanako";
    }
  });
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [bubbleVisible, setBubbleVisible] = useState(true);

  const currentStudent =
    HERO_STUDENTS.find((s) => s.id === selectedStudentId) || HERO_STUDENTS[0];

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    setQuoteIndex(0);
    setBubbleVisible(true);
    try {
      localStorage.setItem("ba_hero_student", id);
    } catch {}
    trackEvent("hero_student_switch", { student: id });
  };

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % currentStudent.quotes.length);
    setBubbleVisible(true);
  };

  return (
    <section className="hero">
      <div className="hero-art">
        <div className="hero-grid" />
        <div
          className="hero-glow"
          style={{
            background: `radial-gradient(circle, ${currentStudent.glowColor}, transparent 68%)`,
          }}
        />
        <span className="hero-cloud cloud-1" aria-hidden="true" />
        <span className="hero-cloud cloud-2" aria-hidden="true" />
        <div className="hero-halo" aria-hidden="true">
          <span className="hero-halo-ring" />
          <span className="hero-halo-ring hero-halo-ring-2" />
        </div>

        {/* 顶部看板娘切换胶囊（轻量、清爽、绝不遮挡角色身躯） */}
        <div className="hero-student-switcher" role="tablist" aria-label="看板娘选择">
          {HERO_STUDENTS.map((st) => {
            const isActive = st.id === currentStudent.id;
            return (
              <button
                key={st.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`student-switch-btn ${isActive ? "is-active" : ""}`}
                style={
                  isActive
                    ? {
                        borderColor: st.themeColor,
                        boxShadow: `0 2px 14px ${st.glowColor}`,
                      }
                    : undefined
                }
                onClick={() => handleSelectStudent(st.id)}
                title={`看板娘：${st.name}`}
              >
                <img
                  src={st.avatar}
                  alt={st.name}
                  className="student-switch-avatar"
                  loading="lazy"
                />
                <span className="student-switch-name">{st.name}</span>
                {isActive && (
                  <span
                    className="student-switch-dot"
                    style={{ background: st.themeColor }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 互动羁绊语音气泡（位于左侧空气层，与立绘分立，杜绝遮挡面庞） */}
        {bubbleVisible && (
          <div
            className="hero-speech-bubble"
            onClick={handleNextQuote}
            title="点击切换台词"
            style={{
              borderColor: `${currentStudent.themeColor}55`,
            }}
          >
            <div className="speech-bubble-header">
              <span
                className="speech-bubble-tag"
                style={{ color: currentStudent.themeColor }}
              >
                {currentStudent.tag}
              </span>
              <span className="speech-bubble-hint">点击互动 ♡</span>
            </div>
            <p className="speech-bubble-text">
              {currentStudent.quotes[quoteIndex]}
            </p>
          </div>
        )}

        {/* 看板娘立绘展示（点击立绘亦可触发互动羁绊语音） */}
        <div
          className="hero-character-stage"
          onClick={handleNextQuote}
          title={`点击与${currentStudent.name}互动`}
        >
          <img
            key={currentStudent.id}
            className={`hero-shiroko hero-character-portrait hero-portrait-${currentStudent.id}`}
            src={currentStudent.portrait}
            alt={currentStudent.name}
            loading="eager"
            decoding="async"
          />
        </div>

        <div className="hero-particles" aria-hidden="true">
          <span className="spark s1" />
          <span className="spark s2" />
          <span className="spark s3" />
          <span className="spark s4" />
          <span className="spark s5" />
        </div>

        <div className="hero-figure">
          <SchaleRadar status={translateStatus} />
          {showStatus && (
            <div className="figure-card figure-card-main">
              <span>01</span>
              <strong>
                文本汉化
                <br />
                {getStatusLabel(translateStatus)}
              </strong>
              <em>{textTranslation?.resourceVersion || "待配置"}</em>
            </div>
          )}
          {showDownloads && (
            <div className="figure-card figure-card-side figure-card-2">
              <span>02</span>
              <strong>
                官方
                <br />
                版本
              </strong>
              <em>{textTranslation?.officialVersion || "待配置"}</em>
            </div>
          )}
          {showStatus && (
            <div className="figure-card figure-card-side figure-card-3">
              <span>03</span>
              <strong>
                版本
                <br />
                校验
              </strong>
              <em>{translateIndicator}</em>
            </div>
          )}
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
          {showDownloads && (
            <Link
              to="/download"
              className="button button-primary ripple-btn"
              onClick={() => trackEvent("download_click", { source: "hero" })}
            >
              <ArrowDownToLine size={17} /> 获取资源
            </Link>
          )}
          {showNews && (
            <Link to="/news" className="button button-ghost">
              查看公告 <ArrowRight size={17} />
            </Link>
          )}
        </div>
        <div className="hero-stats">
          {showDownloads && (
            <div>
              <strong>{version}</strong>
              <span>当前汉化版本</span>
            </div>
          )}
          {showStatus && (
            <div>
              <strong>AUTO</strong>
              <span>版本状态校验</span>
            </div>
          )}
          {showDownloads && (
            <div>
              <strong>{platformCount}</strong>
              <span>平台资源</span>
            </div>
          )}
        </div>
        <div className="hero-scroll">
          <span /> 向下探索
        </div>
      </div>
    </section>
  );
}
