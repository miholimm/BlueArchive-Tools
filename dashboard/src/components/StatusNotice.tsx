import { CheckCircle2, CircleAlert, LoaderCircle, Radio } from "lucide-react";
import type { ConsoleNotice } from "../types";

interface StatusNoticeProps {
  notice: ConsoleNotice;
  loading?: boolean;
}

export function StatusNotice({ notice, loading = false }: StatusNoticeProps) {
  const Icon = loading ? LoaderCircle : notice.tone === "success" ? CheckCircle2 : notice.tone === "error" ? CircleAlert : Radio;

  return (
    <section className={`status-notice ${notice.tone}`} aria-live="polite">
      <span className={loading ? "status-notice-icon is-spinning" : "status-notice-icon"}>
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <div>
        <strong>{notice.title}</strong>
        <p>{notice.detail}</p>
      </div>
    </section>
  );
}
