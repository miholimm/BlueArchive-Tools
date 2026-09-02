import { ArrowUpRight, ExternalLink, X } from "lucide-react";
import { useEffect } from "react";
import type { DownloadItem } from "../types";
import { trackEvent } from "../lib/tracking";
import { ChecksumBadge } from "./ChecksumBadge";

function isDownloadUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export default function DownloadModal({
  open,
  onClose,
  selected,
  showChecksum = false,
}: {
  open: boolean;
  onClose: () => void;
  selected: DownloadItem | null;
  showChecksum?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !selected) return null;
  const targetAvailable = isDownloadUrl(selected.url);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="download-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="关闭下载窗口"
        >
          <X size={19} />
        </button>
        <span className="eyebrow">DOWNLOAD CENTER / 资源中心</span>
        <h2 id="download-modal-title">确认下载资源</h2>
        <div className="selected-download">
          <p>{selected.name}</p>
          <span>
            版本 v{selected.version} · 更新于 {selected.updated}
          </span>
          {targetAvailable ? (
            <a
              href={selected.url}
              target="_blank"
              rel="noreferrer"
              className="button button-primary"
              onClick={() =>
                trackEvent("download_redirect", {
                  source: "download_modal",
                  name: selected.name,
                  url: selected.url,
                })
              }
            >
              前往下载 <ArrowUpRight size={16} />
            </a>
          ) : (
            <div className="download-unavailable">
              <ExternalLink size={15} /> 下载链接待补充
            </div>
          )}
          {showChecksum && <ChecksumBadge checksum={selected.checksum} />}
        </div>
        <p className="modal-footnote">
          请确认你已阅读使用说明。资源仅供学习交流使用。
        </p>
      </div>
    </div>
  );
}
