type RadarMarker = { angle: number; radius: number; label: string };

const markers: RadarMarker[] = [
  { angle: 34, radius: 105, label: "SYNC" },
  { angle: 148, radius: 90, label: "DATA" },
  { angle: 226, radius: 123, label: "HQ" },
  { angle: 307, radius: 98, label: "NODE" },
];

function markerPoint(marker: RadarMarker) {
  const radians = ((marker.angle - 90) * Math.PI) / 180;
  return {
    x: 180 + Math.cos(radians) * marker.radius,
    y: 180 + Math.sin(radians) * marker.radius,
  };
}

export default function SchaleRadar({ status }: { status: string }) {
  const statusLabel = status === "normal" ? "SYNCED" : status === "error" ? "MISMATCH" : "PENDING";

  return (
    <div className="schale-radar" aria-label={`夏莱终端状态 ${statusLabel}`}>
      <div className="radar-scanline" />
      <svg viewBox="0 0 360 360" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="radarSweep" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#00a3ff" stopOpacity="0" />
            <stop offset="1" stopColor="#00d9ff" stopOpacity="0.55" />
          </linearGradient>
          <filter id="radarGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g className="radar-rings">
          {[42, 78, 114, 150].map((radius) => <circle key={radius} cx="180" cy="180" r={radius} />)}
          <path d="M30 180H330M180 30V330M73.9 73.9L286.1 286.1M286.1 73.9L73.9 286.1" />
        </g>
        <g className="radar-ticks">
          {Array.from({ length: 48 }, (_, index) => {
            const angle = (index * 360) / 48;
            const radians = ((angle - 90) * Math.PI) / 180;
            const isMajor = index % 4 === 0;
            const outer = 157;
            const inner = isMajor ? 145 : 151;
            return <line key={index} x1={180 + Math.cos(radians) * inner} y1={180 + Math.sin(radians) * inner} x2={180 + Math.cos(radians) * outer} y2={180 + Math.sin(radians) * outer} />;
          })}
        </g>
        <path className="radar-sweep" d="M180 180 L180 34 A146 146 0 0 1 306 107 Z" fill="url(#radarSweep)" />
        <path className="radar-beam" d="M180 180 L306 107" />
        <circle className="radar-core-outer" cx="180" cy="180" r="19" />
        <circle className="radar-core" cx="180" cy="180" r="8" />
        {markers.map((marker) => {
          const point = markerPoint(marker);
          return (
            <g className="radar-marker" key={marker.label}>
              <circle cx={point.x} cy={point.y} r="5" />
              <circle cx={point.x} cy={point.y} r="11" />
              <text x={point.x + 10} y={point.y - 9}>{marker.label}</text>
            </g>
          );
        })}
        <path className="radar-frame" d="M20 90V20H90M270 20H340V90M340 270V340H270M90 340H20V270" />
      </svg>
      <div className="radar-center-mark">
        <span>SCHALE</span>
        <strong>{statusLabel}</strong>
        <small>SYS-VER 2.4</small>
      </div>
      <div className="radar-label radar-label-top">SECTOR-01 / KIVOTOS</div>
      <div className="radar-label radar-label-bottom">LOCALIZATION UPLINK</div>
    </div>
  );
}
