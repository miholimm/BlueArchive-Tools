import { Braces, ChevronDown } from "lucide-react";
import type { ResourceApiData } from "../types";

export function DebugPanel({ raw }: { raw: ResourceApiData | null }) {
  if (!raw) return null;

  return (
    <details className="debug-panel">
      <summary>
        <span><Braces size={16} strokeWidth={1.8} /> 调试信息</span>
        <ChevronDown size={16} strokeWidth={1.8} />
      </summary>
      <div className="debug-content">
        <span>资源服务原始响应，仅供查看</span>
        <pre>{JSON.stringify(raw, null, 2)}</pre>
      </div>
    </details>
  );
}
