import type { GlossaryTerm } from "../types";

function escapePattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termLookup(terms: GlossaryTerm[]) {
  const entries = terms
    .flatMap((term) => [
      [term.zh, term],
      [term.ja, term],
    ] as const)
    .filter(([term]) => term.length > 1)
    .sort(([left], [right]) => right.length - left.length);
  return new Map(entries);
}

export default function GlossaryText({
  text,
  terms,
}: {
  text: string;
  terms: GlossaryTerm[];
}) {
  const lookup = termLookup(terms);
  const candidates = [...lookup.keys()];
  if (!candidates.length) return <>{text}</>;

  const expression = new RegExp(`(${candidates.map(escapePattern).join("|")})`, "g");
  const parts = text.split(expression);

  return (
    <>
      {parts.map((part, index) => {
        const term = lookup.get(part);
        if (!term) return <span key={`${part}-${index}`}>{part}</span>;
        return (
          <span className="glossary-inline-term" tabIndex={0} key={`${term.id}-${index}`}>
            {part}
            <span className="glossary-tooltip" role="tooltip">
              <strong>{term.zh}</strong>
              <small>{term.ja} / {term.romaji || "-"}</small>
              <span>{term.category}{term.note ? ` · ${term.note}` : ""}</span>
            </span>
          </span>
        );
      })}
    </>
  );
}
