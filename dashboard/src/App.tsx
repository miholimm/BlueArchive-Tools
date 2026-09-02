import {
  BookOpenText,
  Check,
  CircleAlert,
  FileImage,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { AppHeader } from "./components/AppHeader";
import { DebugPanel } from "./components/DebugPanel";
import { ResourceSwitch } from "./components/ResourceSwitch";
import { StatusNotice } from "./components/StatusNotice";
import { UserIdentityPanel } from "./components/UserIdentityPanel";
import { VoiceSelector } from "./components/VoiceSelector";
import { useResourceConsole } from "./hooks/use-resource-console";
import { isChineseTextEnabled, textLocaleFromEnabled, voiceLocaleLabel } from "./lib/resource-model";

function ConfigurationSkeleton() {
  return (
    <section className="resource-settings skeleton-settings" aria-label="正在读取资源配置">
      {[0, 1, 2].map((item) => <div key={item} className="resource-card skeleton-card"><span /><span /></div>)}
    </section>
  );
}

function ConfigurationEmpty({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="configuration-empty">
      <span className="configuration-empty-icon"><CircleAlert size={26} strokeWidth={1.7} /></span>
      <div>
        <h2>资源配置暂不可用</h2>
        <p>确认用户 ID 后可重新读取资源服务。</p>
      </div>
      <button className="button button-ghost" type="button" onClick={onRetry}>
        <RotateCcw size={16} strokeWidth={1.9} /> 重新读取
      </button>
    </section>
  );
}

export default function App() {
  const console = useResourceConsole();
  const hasConfiguration = Boolean(console.saved && console.draft);
  const isLoading = console.phase === "loading";
  const isBusy = isLoading || console.isSaving;
  const draft = console.draft;
  const saved = console.saved;

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="console-main">
        <section className="console-hero">
          <div className="hero-content">
            <span className="hero-kicker"><ShieldCheck size={15} strokeWidth={1.8} /> PERSONAL RESOURCE SYSTEM</span>
            <h1>资源控制台</h1>
            <p>管理你的文本、语音与图文资源配置。</p>
          </div>
          <div className="hero-index" aria-hidden="true">
            <span>BA</span>
            <small>RESOURCE<br />CONTROL</small>
          </div>
        </section>

        <div className="console-grid">
          <aside className="console-sidebar">
            <UserIdentityPanel
              userId={console.userId}
              identity={console.identity}
              loading={isBusy}
              onSelectUser={console.selectUser}
              onReload={console.load}
            />
            {hasConfiguration && draft && (
              <section className="resource-overview">
                <span className="panel-kicker">OVERVIEW / 02</span>
                <h2>当前选择</h2>
                <dl>
                  <div><dt><BookOpenText size={15} strokeWidth={1.8} /> 文本</dt><dd>{isChineseTextEnabled(draft.text) ? "中文" : "日文"}</dd></div>
                  <div><dt><Volume2 size={15} strokeWidth={1.8} /> 语音</dt><dd>{voiceLocaleLabel(draft.voice)}</dd></div>
                  <div><dt><FileImage size={15} strokeWidth={1.8} /> 图文</dt><dd>{isChineseTextEnabled(draft.media) ? "中文" : "日文"}</dd></div>
                </dl>
              </section>
            )}
          </aside>

          <section className="console-workspace">
            <StatusNotice notice={console.notice} loading={isBusy} />

            <div className="workspace-heading">
              <div>
                <span className="panel-kicker">SETTINGS / 03</span>
                <h2>资源设置</h2>
              </div>
              {hasConfiguration && (
                <span className={console.changeCount ? "change-chip is-active" : "change-chip"}>
                  {console.changeCount ? `${console.changeCount} 项未保存` : "已同步"}
                </span>
              )}
            </div>

            {isLoading && <ConfigurationSkeleton />}
            {!isLoading && !hasConfiguration && console.userId && <ConfigurationEmpty onRetry={console.load} />}
            {hasConfiguration && draft && saved && (
              <>
                <section className="resource-settings">
                  <ResourceSwitch
                    id="text-resource"
                    title="文本汉化"
                    description="界面与剧情文本的本地化资源"
                    icon={BookOpenText}
                    enabled={isChineseTextEnabled(draft.text)}
                    changed={draft.text !== saved.text}
                    disabled={isBusy}
                    onChange={(enabled) => console.setText(textLocaleFromEnabled(enabled))}
                  />
                  <VoiceSelector
                    value={draft.voice}
                    changed={draft.voice !== saved.voice}
                    disabled={isBusy}
                    onChange={console.setVoice}
                  />
                  <ResourceSwitch
                    id="media-resource"
                    title="图文汉化"
                    description="图片与图形素材的本地化资源"
                    icon={FileImage}
                    enabled={isChineseTextEnabled(draft.media)}
                    changed={draft.media !== saved.media}
                    disabled={isBusy}
                    onChange={(enabled) => console.setMedia(textLocaleFromEnabled(enabled))}
                  />
                </section>

                <section className="save-bar">
                  <div>
                    <span className={console.changeCount ? "save-bar-mark changed" : "save-bar-mark"}>
                      {console.changeCount ? <Settings2 size={18} strokeWidth={1.8} /> : <Check size={18} strokeWidth={1.8} />}
                    </span>
                    <div>
                      <strong>{console.changeCount ? "修改尚未保存" : "所有资源已同步"}</strong>
                      <p>{console.changeCount ? "保存时仅会提交改动过的资源字段。" : "当前配置与服务器上的状态一致。"}</p>
                    </div>
                  </div>
                  <div className="save-actions">
                    <button className="button button-ghost" type="button" onClick={console.discardChanges} disabled={!console.changeCount || isBusy}>
                      <RotateCcw size={16} strokeWidth={1.9} /> 还原
                    </button>
                    <button className="button button-primary" type="button" onClick={() => void console.save()} disabled={!console.changeCount || isBusy}>
                      <Save size={16} strokeWidth={1.9} />
                      {console.isSaving ? "保存中" : "保存修改"}
                    </button>
                  </div>
                </section>
              </>
            )}

            <DebugPanel raw={console.raw} />
          </section>
        </div>
      </main>
      <footer className="site-footer">
        <span>BLUE ARCHIVE LOCALIZATION PROJECT</span>
        <span>非官方玩家项目 · 与 NEXON 无关</span>
      </footer>
    </div>
  );
}
