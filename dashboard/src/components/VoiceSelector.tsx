import { ChevronDown, Volume2 } from "lucide-react";
import type { VoiceLocale } from "../types";
import { voiceLocaleLabel } from "../lib/resource-model";

interface VoiceSelectorProps {
  value: VoiceLocale;
  changed: boolean;
  disabled: boolean;
  onChange: (value: VoiceLocale) => void;
}

const options: VoiceLocale[] = ["Default", "CN", "KR"];

export function VoiceSelector({ value, changed, disabled, onChange }: VoiceSelectorProps) {
  return (
    <article className={changed ? "resource-card voice-card is-changed" : "resource-card voice-card"}>
      <div className="resource-card-leading">
        <span className="resource-icon"><Volume2 size={21} strokeWidth={1.7} /></span>
        <div>
          <h3>主线语音</h3>
          <p>剧情主线的语音资源</p>
        </div>
      </div>
      <label className="voice-select-control">
        <span>当前语音</span>
        <div>
          <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as VoiceLocale)}>
            {options.map((option) => <option key={option} value={option}>{voiceLocaleLabel(option)}</option>)}
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </div>
      </label>
    </article>
  );
}
