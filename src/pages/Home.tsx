import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  Download,
  Languages,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import NewsCard from "../components/NewsCard";
import NewsCardSkeleton from "../components/NewsCardSkeleton";
import Reveal from "../components/Reveal";
import { useContent, useContentLoading } from "../lib/ContentContext";
import { canAccessModule, useAdminAccess } from "../lib/moduleAccess";
import { getResourceStatus, getStatusLabel, getStatusResource } from "../lib/status";
import { trackEvent } from "../lib/tracking";
import StatusValue from "../components/StatusValue";

export default function Home() {
  const { news, download, team, status, settings } = useContent();
  const contentLoading = useContentLoading();
  const admin = useAdminAccess();
  const showTeam = canAccessModule(settings, "team", admin);
  const showNews = canAccessModule(settings, "news", admin);
  const showDownloads = canAccessModule(settings, "downloads", admin);
  const showStatus = canAccessModule(settings, "status", admin);
  const showTutorial = canAccessModule(settings, "tutorial", admin);
  const textTranslation = getStatusResource("textTranslation", status);
  const translateStatus = textTranslation ? getResourceStatus(textTranslation) : "pending";
  const translateStatusLabel = getStatusLabel(translateStatus);
  const resourceVersion = textTranslation?.resourceVersion || "待配置";
  const resourceDate = textTranslation?.resourceUpdatedAt || "待配置";
  const officialVersion = textTranslation?.officialVersion || "待配置";
  const officialDate = textTranslation?.officialUpdatedAt || "待配置";
  const platformCount = Object.values(download).filter(
    (items) => items.length > 0,
  ).length;

  // 城区导览：与导航栏的四个城区一一对应，给新访客清晰的落脚点
  const districtCards = [
    {
      key: "schale",
      label: "夏莱",
      en: "SCHALE",
      icon: Building2,
      desc: "认识团队、追踪公告与贡献记录",
      gate: showTeam,
      links: [
        { to: "/team", label: "汉化组", show: showTeam },
        { to: "/news", label: "公告", show: showNews },
        { to: "/contributors", label: "贡献榜", show: canAccessModule(settings, "contributors", admin) },
      ],
    },
    {
      key: "story",
      label: "剧情",
      en: "STORY",
      icon: BookOpen,
      desc: "剧情库、原版播放器与术语档案",
      gate: canAccessModule(settings, "story", admin),
      links: [
        { to: "/story", label: "剧情库", show: canAccessModule(settings, "story", admin) },
        { to: "/story-player", label: "原版播放器", show: canAccessModule(settings, "story", admin) },
        { to: "/glossary", label: "术语库", show: canAccessModule(settings, "glossary", admin) },
      ],
    },
    {
      key: "resources",
      label: "资源",
      en: "RESOURCES",
      icon: Download,
      desc: "下载汉化资源、安装教程与更新日志",
      gate: showDownloads,
      links: [
        { to: "/download", label: "资源下载", show: showDownloads },
        { to: "/tutorial", label: "安装教程", show: showTutorial },
        { to: "/status", label: "维护状态", show: showStatus },
      ],
    },
    {
      key: "community",
      label: "社区",
      en: "COMMUNITY",
      icon: Users,
      desc: "问答、翻译反馈与协作工作台",
      gate: canAccessModule(settings, "qa", admin),
      links: [
        { to: "/qa", label: "问答", show: canAccessModule(settings, "qa", admin) },
        { to: "/feedback", label: "翻译反馈", show: canAccessModule(settings, "feedback", admin) },
        { to: "/faq", label: "常见问题", show: canAccessModule(settings, "faq", admin) },
      ],
    },
  ];

  return (
    <>
      <Hero
        showNews={showNews}
        showStatus={showStatus}
        showDownloads={showDownloads}
      />
      <main>
        <section className="section district-section">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">KIVOTOS / 城区导览</span>
                <h2>从哪个城区开始？</h2>
                <p>全站内容按四个城区组织，选择你的目的地。</p>
              </div>
            </div>
          </Reveal>
          <div className="district-grid">
            {districtCards
              .filter((district) => district.gate)
              .map((district, index) => {
                const Icon = district.icon
                return (
                  <Reveal key={district.key} delay={index * 80} spring="up">
                    <article className="district-card">
                      <span className="district-halo" aria-hidden="true" />
                      <span className="district-icon"><Icon size={22} /></span>
                      <h3>{district.label}</h3>
                      <span className="district-en">{district.en}</span>
                      <p>{district.desc}</p>
                      <div className="district-links">
                        {district.links
                          .filter((link) => link.show)
                          .map((link) => (
                            <Link key={link.to} to={link.to}>{link.label}</Link>
                          ))}
                      </div>
                    </article>
                  </Reveal>
                )
              })}
          </div>
        </section>

        {showStatus && <section className="section status-strip">
          <Reveal>
            <div className="section-heading compact">
              <span className="eyebrow">01 / STATUS</span>
              <h2>项目状态</h2>
              <p>展示文本汉化资源与官方版本的自动比对结果。</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="status-overview">
              <div className="status-main">
                <div className={`status-check ${translateStatus}`}>
                  <Check size={22} />
                </div>
                <div>
                  <span>当前汉化状态</span>
                  <strong><i className={`status-pulse ${translateStatus}`} />{translateStatusLabel}</strong>
                </div>
                <b>AUTO CHECK</b>
              </div>
              <div className="stat-block">
                <span>资源版本</span>
                <strong><StatusValue label="RESOURCE" value={resourceVersion === "待配置" ? "" : resourceVersion} updatedAt={resourceDate} /></strong>
              </div>
              <div className="stat-block">
                <span>官方版本</span>
                <strong className="status-compatible"><StatusValue label="OFFICIAL" value={officialVersion === "待配置" ? "" : officialVersion} updatedAt={officialDate} /></strong>
              </div>
              <Link to="/status" className="status-link">
                查看完整状态 <ArrowRight size={17} />
              </Link>
            </div>
          </Reveal>
        </section>}

        {showNews && <section className="section news-section">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">02 / TRANSMISSION</span>
                <h2>最新公告</h2>
                <p>记录每一次版本更新与项目进展。</p>
              </div>
              <Link to="/news" className="text-link">
                查看全部公告 <ArrowRight size={16} />
              </Link>
            </div>
          </Reveal>
          <div className="news-grid">
            {contentLoading && Array.from({ length: 3 }, (_, index) => (
              <NewsCardSkeleton key={`news-skeleton-${index}`} featured={index === 0} />
            ))}
            {!contentLoading && news.slice(0, 3).map((item, index) => (
              <Reveal key={item.id} delay={index * 100} spring="up">
                <NewsCard news={item} featured={index === 0} />
              </Reveal>
            ))}
            {!contentLoading && news.length === 0 && (
              <div className="empty-state">暂无公告，内容将在更新后显示。</div>
            )}
          </div>
        </section>}

        {showTeam && <Reveal>
          <section className="manifesto">
            <div className="manifesto-decor">
              <span className="decor-circle" />
              <span className="decor-line" />
            </div>
            <div>
              <span className="eyebrow">03 / OUR MISSION</span>
              <h2>
                让故事，
                <br />
                <em>被更多人听见。</em>
              </h2>
            </div>
            <div className="manifesto-copy">
              <p>
                本地化不只是文字的转换，更是一次跨越语言的相遇。我们尊重原作的每一份细节，也认真对待每一位老师的反馈。
              </p>
              <Link to="/team" className="button button-dark">
                认识汉化组 <ArrowRight size={17} />
              </Link>
            </div>
            <div className="manifesto-icons">
              <Languages />
              <ShieldCheck />
              <Radio />
            </div>
          </section>
        </Reveal>}

        {(showDownloads || showTutorial || showStatus) && <section className="section quick-download">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">04 / GET STARTED</span>
                <h2>开始你的基沃托斯之旅</h2>
                  <p>
                  {showTeam ? `${team.length} 位成员持续维护` : '项目持续维护'}
                  {showDownloads ? `，${platformCount} 个平台提供资源。` : '。'}
                </p>
              </div>
            </div>
          </Reveal>
          <div className="quick-grid">
            {showDownloads && <Reveal delay={50} spring="scale">
              <Link
                to="/download"
                onClick={() => trackEvent("download_click", { source: "home_cta" })}
                className="ripple-btn"
              >
                <Download size={22} />
                <span>汉化版客户端</span>
                <small>ANDROID / WINDOWS</small>
                <ArrowRight />
              </Link>
            </Reveal>}
            {showTutorial && <Reveal delay={100} spring="scale">
              <Link to="/tutorial" className="ripple-btn">
                <ArrowRight size={22} />
                <span>安装教程</span>
                <small>GETTING STARTED</small>
                <ArrowRight />
              </Link>
            </Reveal>}
            {showStatus && <Reveal delay={150} spring="scale">
              <Link to="/status" className="ripple-btn">
                <CalendarDays size={22} />
                <span>查看维护状态</span>
                <small>AUTO VERSION CHECK</small>
                <ArrowRight />
              </Link>
            </Reveal>}
          </div>
        </section>}
      </main>
    </>
  );
}
