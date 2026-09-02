import { Check, CircleAlert, Clock3, RefreshCw } from "lucide-react";
import Reveal from "../components/Reveal";
import StatusCard from "../components/StatusCard";
import { useContent } from "../lib/ContentContext";
import { getResourceStatus, normalizeStatusData } from "../lib/status";

export default function Status() {
  const { status } = useContent();
  const normalizedStatus = normalizeStatusData(status);
  const normalCount = normalizedStatus.resources.filter((resource) => getResourceStatus(resource) === "normal").length;
  const pendingCount = normalizedStatus.resources.filter((resource) => getResourceStatus(resource) === "pending").length;
  const errorCount = normalizedStatus.resources.filter((resource) => getResourceStatus(resource) === "error").length;
  const bannerStatus = errorCount > 0 ? "error" : pendingCount > 0 ? "pending" : "normal";
  const headline = errorCount > 0
    ? `检测到 ${errorCount} 项资源需要关注`
    : pendingCount > 0
      ? `等待补充 ${pendingCount} 项资源信息`
      : "九项资源状态均已就绪";
  const BannerIcon = bannerStatus === "error" ? CircleAlert : bannerStatus === "pending" ? Clock3 : Check;

  return (
    <main className="page-shell">
      <Reveal>
        <div className="page-hero status-page-hero">
          <span className="eyebrow">SYSTEM / 04</span>
          <h1>维护状态</h1>
          <p>展示九项资源的当前维护信息与版本记录。</p>
          <div className="page-hero-number">
            <RefreshCw />
            <small>STATUS BOARD</small>
          </div>
        </div>
      </Reveal>
      <section className="section status-page-content">
        <Reveal>
          <div
            className={`status-banner ${bannerStatus}`}
          >
            <div className="status-check">
              <BannerIcon size={22} />
            </div>
            <div>
              <span>
                {bannerStatus === "error"
                  ? "部分资源状态需要关注"
                  : bannerStatus === "pending"
                    ? "部分资源信息尚未完善"
                    : "全部资源状态运行正常"}
              </span>
              <strong>{headline}</strong>
            </div>
            <small>
              <Clock3 size={14} /> 正常 {normalCount} / 待配置 {pendingCount} / 异常 {errorCount}
            </small>
          </div>
        </Reveal>
        <div className="status-cards-grid">
          {normalizedStatus.resources.map((resource, index) => (
            <Reveal key={resource.id} delay={index * 55} spring="scale">
              <StatusCard resource={resource} />
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="status-legend">
            <span>
              <i className="status-light normal" /> 正常
            </span>
            <span>
              <i className="status-light pending" /> 待配置
            </span>
            <span>
              <i className="status-light error" /> 异常
            </span>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
