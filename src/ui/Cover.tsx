import type { CSSProperties, ReactNode } from "react";

/** Each course has one colour, used for its banner, card edge and chips. */
export const courseVar = (color: number): CSSProperties => ({ ["--k" as string]: `var(--k${color % 8})` });

export function Cover({ color, className = "", children }: { color: number; pattern?: number; className?: string; children?: ReactNode }) {
  return (
    <div className={`cover ${className}`} style={courseVar(color)}>
      {children}
    </div>
  );
}
