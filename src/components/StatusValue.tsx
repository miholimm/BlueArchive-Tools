import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { relativeTime } from "../lib/time";

export default function StatusValue({
  value,
  updatedAt,
  label,
}: {
  value: string;
  updatedAt: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  const displayValue = value || "待配置";

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      const input = document.createElement("textarea");
      input.value = value;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <>
      <span className="status-tech-label">{label}</span>
      <button
        type="button"
        className="status-copy-value"
        onClick={copy}
        disabled={!value}
        title={value ? `复制 ${label}` : `${label}待配置`}
      >
        <code>{displayValue}</code>
        {value && (copied ? <Check size={13} /> : <Copy size={13} />)}
      </button>
      <small className="status-relative-time">{relativeTime(updatedAt)}</small>
    </>
  );
}
