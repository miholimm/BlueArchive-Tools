import { ArrowDownToLine, Zap } from "lucide-react";
import { useState } from "react";
import DownloadCard from "../components/DownloadCard";
import DownloadModal from "../components/DownloadModal";
import Reveal from "../components/Reveal";
import { useContent } from "../lib/ContentContext";
import { useAdminAccess } from "../lib/moduleAccess";
import type { DownloadData, DownloadItem } from "../types";

const groups: { key: keyof DownloadData; label: string; note: string }[] = [
  { key: "android", label: "Android", note: "移动端 / 安卓设备" },
  { key: "windows", label: "Windows", note: "桌面端 / Windows 10+" },
  { key: "ios", label: "iOS", note: "移动端 / iPhone & iPad" },
  { key: "macos", label: "macOS", note: "桌面端 / Apple Silicon & Intel" },
];

function isDownloadUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export default function Download() {
  const { download } = useContent();
  const admin = useAdminAccess();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DownloadItem | null>(null);
  const show = (item: DownloadItem) => {
    setSelected(item);
    setOpen(true);
  };
  const activeGroups = groups.filter((group) => download[group.key].length > 0);

  return (
    <main className="page-shell">
      <Reveal>
        <div className="page-hero download-page-hero">
          <span className="eyebrow">DOWNLOAD / 03</span>
          <h1>资源下载</h1>
          <p>选择你的设备，开始一段全新的校园生活。</p>
          <div className="page-hero-number">
            {download.android[0]?.version || "—"}
            <br />
            <small>STABLE</small>
          </div>
        </div>
      </Reveal>
      <section className="section download-section">
        {activeGroups.map((group, gi) => (
          <Reveal key={group.key} delay={gi * 80}>
            <div className="download-group">
              <div className="download-group-heading">
                <div>
                  <span className="eyebrow">PLATFORM</span>
                  <h2>{group.label}</h2>
                </div>
                <span>{group.note}</span>
              </div>
              <div className="download-list">
                {download[group.key].map((item, index) => (
                  <Reveal key={`${group.key}-${item.name}`} delay={index * 60}>
                    <DownloadCard
                      item={item}
                      platform={group.key}
                      onDownload={show}
                      showChecksum={admin}
                    />
                    {item.diff && (
                      <div className="download-diff-bar">
                        <Zap size={14} />
                        <span>增量更新可用</span>
                        <small>
                          完整包 {item.size || "—"} → 增量包 {item.diff.size}
                        </small>
                        {isDownloadUrl(item.diff.url) ? (
                          <a
                            href={item.diff.url}
                            target="_blank"
                            rel="noreferrer"
                            className="download-diff-link"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <ArrowDownToLine size={13} /> 下载增量包
                          </a>
                        ) : (
                          <span className="download-diff-link is-disabled">
                            链接待补充
                          </span>
                        )}
                      </div>
                    )}
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
        {activeGroups.length === 0 && (
          <div className="empty-state">当前暂无可用资源。</div>
        )}
      </section>
      <DownloadModal
        open={open}
        onClose={() => {
          setOpen(false);
          setSelected(null);
        }}
        selected={selected}
        showChecksum={admin}
      />
    </main>
  );
}
