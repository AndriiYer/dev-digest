import type { CSSProperties } from "react";

/** Co-located styles for FindingsPreviewPopover. */
export const s = {
  panel: {
    // top/left are set inline per-instance (computed from the anchor's
    // bounding rect) — this is portaled to document.body, so `fixed` +
    // viewport-relative coordinates, not `absolute` relative to a parent.
    position: "fixed",
    width: 380,
    maxHeight: 420,
    overflowY: "auto",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-strong)",
    borderRadius: 9,
    boxShadow: "var(--shadow-modal)",
    padding: 10,
    zIndex: 40,
    animation: "ddpop .12s ease",
  } satisfies CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    padding: "2px 4px 8px",
  } satisfies CSSProperties,
  list: { display: "flex", flexDirection: "column", gap: 8 } satisfies CSSProperties,
  empty: { fontSize: 13, color: "var(--text-muted)", padding: "8px 4px" } satisfies CSSProperties,
  row: {
    padding: 8,
    borderRadius: 7,
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
  } satisfies CSSProperties,
  rowHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  } satisfies CSSProperties,
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } satisfies CSSProperties,
  meta: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 } satisfies CSSProperties,
  rationale: {
    margin: 0,
    fontSize: 12.5,
    lineHeight: 1.4,
    color: "var(--text-secondary)",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  } satisfies CSSProperties,
} as const;
