import type { CSSProperties } from "react";

/** Co-located styles for FindingsPanel (extracted from inline styles). */
export const s = {
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  } satisfies CSSProperties,
  chipsGroup: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  } satisfies CSSProperties,
  severityChip: (active: boolean, someActive: boolean, color: string): CSSProperties => ({
    background: "none",
    border: "none",
    padding: 0,
    borderRadius: 6,
    cursor: "pointer",
    opacity: someActive && !active ? 0.45 : 1,
    boxShadow: active ? `0 0 0 1.5px ${color}` : "none",
    transition: "opacity .1s, box-shadow .1s",
  }),
  divider: {
    width: 1,
    height: 18,
    background: "var(--border)",
    margin: "0 2px",
  } satisfies CSSProperties,
  toggleGroup: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "var(--text-secondary)",
  } satisfies CSSProperties,
  list: { display: "flex", flexDirection: "column", gap: 12 } satisfies CSSProperties,
} as const;
