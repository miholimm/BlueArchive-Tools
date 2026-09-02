import type { LucideIcon } from "lucide-react";

interface ResourceSwitchProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  changed: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function ResourceSwitch({
  id,
  title,
  description,
  icon: Icon,
  enabled,
  changed,
  disabled,
  onChange,
}: ResourceSwitchProps) {
  return (
    <article className={changed ? "resource-card is-changed" : "resource-card"}>
      <div className="resource-card-leading">
        <span className="resource-icon"><Icon size={21} strokeWidth={1.7} /></span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <label className="switch-control" htmlFor={id}>
        <span className="switch-copy">
          <strong>{enabled ? "开启" : "关闭"}</strong>
          <small>{enabled ? "CN" : "JP"}</small>
        </span>
        <input
          id={id}
          type="checkbox"
          checked={enabled}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
        />
        <span className="switch-track" aria-hidden="true"><span /></span>
      </label>
    </article>
  );
}
