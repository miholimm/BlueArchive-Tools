import { RadioTower } from "lucide-react";

export function AppHeader() {
  const homeUrl = import.meta.env.BASE_URL;

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="brand" href={homeUrl} aria-label="Blue Archive 资源控制台首页">
          <span className="brand-mark">BA</span>
          <span className="brand-copy">
            <strong>蔚蓝档案</strong>
            <small>本地化计划 / RESOURCE CONSOLE</small>
          </span>
        </a>
        <div className="header-signal">
          <span className="signal-dot" aria-hidden="true" />
          <RadioTower size={14} strokeWidth={1.8} />
          <span>RESOURCE LINK</span>
        </div>
      </div>
    </header>
  );
}
