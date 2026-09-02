import { AtSign, Clipboard, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { userIdSourceLabel } from "../lib/user-id";
import type { UserIdResolution, UserIdSource } from "../types";

interface UserIdentityPanelProps {
  userId: string | null;
  identity: UserIdResolution;
  loading: boolean;
  onSelectUser: (value: string, source?: UserIdSource) => boolean;
  onReload: () => void;
}

function UserIdForm({
  initialValue = "",
  submitLabel,
  disabled,
  onSubmit,
}: {
  initialValue?: string;
  submitLabel: string;
  disabled: boolean;
  onSubmit: (value: string) => boolean;
}) {
  const [value, setValue] = useState(initialValue);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(value);
  }

  return (
    <form className="user-id-form" onSubmit={submit}>
      <label htmlFor="resource-user-id">用户 ID</label>
      <div className="user-id-control">
        <AtSign size={18} aria-hidden="true" />
        <input
          id="resource-user-id"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="输入用户 ID"
          autoComplete="off"
          inputMode="text"
          disabled={disabled}
        />
        <button className="button button-primary" type="submit" disabled={disabled || !value.trim()}>
          <UserRound size={16} strokeWidth={2} />
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export function UserIdentityPanel({
  userId,
  identity,
  loading,
  onSelectUser,
  onReload,
}: UserIdentityPanelProps) {
  const [editing, setEditing] = useState(false);

  if (!userId) {
    return (
      <section className="identity-panel identity-panel-empty">
        <span className="panel-kicker">IDENTITY / 01</span>
        <div className="identity-empty-heading">
          <span className="identity-icon"><ShieldCheck size={24} strokeWidth={1.7} /></span>
          <div>
            <h2>确认你的用户 ID</h2>
            <p>{identity.detail}</p>
          </div>
        </div>
        <UserIdForm submitLabel="读取配置" disabled={loading} onSubmit={onSelectUser} />
      </section>
    );
  }

  return (
    <section className="identity-panel">
      <div className="identity-main">
        <span className="panel-kicker">IDENTITY / 01</span>
        <div className="identity-value">
          <span className="identity-icon"><UserRound size={22} strokeWidth={1.7} /></span>
          <div>
            <span>用户 ID</span>
            <strong>{userId}</strong>
          </div>
        </div>
      </div>
      <div className="identity-meta">
        <span><Clipboard size={14} strokeWidth={1.8} /> {userIdSourceLabel(identity.source)}</span>
        <button className="icon-button" type="button" title="重新读取资源配置" onClick={onReload} disabled={loading}>
          <RefreshCw size={17} strokeWidth={1.9} className={loading ? "is-spinning" : ""} />
        </button>
      </div>
      <div className="identity-actions">
        <button className="text-button" type="button" onClick={() => setEditing((current) => !current)} disabled={loading}>
          {editing ? "收起切换" : "切换用户"}
        </button>
      </div>
      {editing && (
        <div className="identity-editor">
          <UserIdForm
            initialValue={userId}
            submitLabel="切换并读取"
            disabled={loading}
            onSubmit={(value) => {
              const accepted = onSelectUser(value);
              if (accepted) setEditing(false);
              return accepted;
            }}
          />
        </div>
      )}
    </section>
  );
}
