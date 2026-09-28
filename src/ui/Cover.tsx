import { useId, type CSSProperties, type ReactNode } from "react";

/**
 * Each course gets a notebook cover: its colour, one of eight ruled/graph/dot
 * patterns, and a white label with the course code.
 */
export const courseVar = (color: number): CSSProperties => ({ ["--k" as string]: `var(--k${color % 8})` });

function Pattern({ kind, id }: { kind: number; id: string }) {
  const stroke = { stroke: "currentColor", strokeOpacity: 0.26, fill: "none", strokeWidth: 1.4 } as const;
  switch (kind % 8) {
    case 0: // ruled notebook paper with a margin line
      return (
        <>
          <defs>
            <pattern id={id} width="400" height="16" patternUnits="userSpaceOnUse">
              <path d="M0 15.5H400" {...stroke} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
          <path d="M34 0V400" stroke="currentColor" strokeOpacity={0.45} strokeWidth={1.6} />
        </>
      );
    case 1: // graph paper
      return (
        <>
          <defs>
            <pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse">
              <path d="M18 0V18M0 18H18" {...stroke} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
        </>
      );
    case 2: // dot grid
      return (
        <>
          <defs>
            <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="7" cy="7" r="1.5" fill="currentColor" fillOpacity={0.34} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
        </>
      );
    case 3: // diagonal hatch
      return (
        <>
          <defs>
            <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
              <path d="M0 0V12" {...stroke} strokeWidth={2.2} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
        </>
      );
    case 4: // concentric arcs: drawn by Cover itself
      return null;
    case 5: // waves
      return (
        <>
          <defs>
            <pattern id={id} width="40" height="14" patternUnits="userSpaceOnUse">
              <path d="M0 7C10 1 10 1 20 7S30 13 40 7" {...stroke} strokeWidth={1.7} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
        </>
      );
    case 6: // zigzag
      return (
        <>
          <defs>
            <pattern id={id} width="24" height="16" patternUnits="userSpaceOnUse">
              <path d="M0 12L6 4L12 12L18 4L24 12" {...stroke} strokeWidth={1.7} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
        </>
      );
    default: // plus marks
      return (
        <>
          <defs>
            <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse">
              <path d="M11 7V15M7 11H15" {...stroke} strokeWidth={1.8} strokeOpacity={0.34} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
        </>
      );
  }
}

export function Cover({ color, pattern, className = "", children }: { color: number; pattern: number; className?: string; children?: ReactNode }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className={`cover ${className}`} style={courseVar(color)}>
      <svg aria-hidden="true">
        {pattern % 8 === 4 ? (
          Array.from({ length: 16 }, (_, i) => <circle key={i} cx="100%" cy="0" r={26 + i * 22} stroke="currentColor" strokeOpacity={0.26} strokeWidth={1.8} fill="none" />)
        ) : (
          <Pattern kind={pattern} id={`p${id}`} />
        )}
      </svg>
      {children}
    </div>
  );
}
