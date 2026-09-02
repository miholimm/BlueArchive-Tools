export default function StoryPortrait({
  speaker,
  source,
  side,
}: {
  speaker: string;
  source?: string;
  side: "left" | "right";
}) {
  const initials = speaker.slice(0, 2).toUpperCase();

  return (
    <div className={side === "right" ? "story-portrait is-right" : "story-portrait"}>
      {source ? (
        <img className="story-portrait-image" src={source} alt={`${speaker} 立绘`} />
      ) : (
        <div className="story-portrait-fallback" aria-label={`${speaker} 立绘占位`}>{initials}</div>
      )}
    </div>
  );
}
