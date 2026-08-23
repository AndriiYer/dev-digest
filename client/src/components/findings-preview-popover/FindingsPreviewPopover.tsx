/* FindingsPreviewPopover — click-through preview of one severity's findings.
   Purely presentational: the caller fetches/filters and hands over the
   `findings` to render (already scoped to one severity) plus a `totalCount`
   for the header, which can differ from `findings.length` — e.g. "this run
   found 2 things total" while the body lists only the severity that was
   clicked. Two call sites: the PR list's FINDINGS column (fetches its own
   data — the list doesn't have reviews preloaded) and the PR detail page's
   Agent runs timeline (reuses reviews already loaded on that page).

   Rendered via a portal to document.body: both call sites live inside an
   `overflow: hidden` card (for rounded corners), which would otherwise clip
   this panel since it needs to render below the row it's anchored to. */
"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Icon, SeverityBadge, CategoryTag, MonoLink, ConfidenceNum, type Severity, type Category } from "@devdigest/ui";
import type { FindingRecord } from "@devdigest/shared";
import { githubBlobUrl } from "@/lib/github-urls";
import { s } from "./styles";

function lineLabel(f: Pick<FindingRecord, "start_line" | "end_line">): string {
  return f.start_line === f.end_line ? `${f.start_line}` : `${f.start_line}-${f.end_line}`;
}

export function FindingsPreviewPopover({
  findings,
  totalCount,
  contextLabel,
  isLoading,
  anchorRef,
  repoFullName,
  headSha,
}: {
  /** Findings to list — already filtered to the clicked severity. */
  findings: FindingRecord[];
  /** Header count; may differ from `findings.length` (e.g. a run's total). */
  totalCount: number;
  /** Appended after "N FINDINGS", e.g. "in this run" -> "N FINDINGS IN THIS RUN". */
  contextLabel?: string;
  isLoading?: boolean;
  /** Positions the (portaled, fixed) panel just below this element. */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** When both are set, file:line becomes a GitHub blob deep-link. */
  repoFullName?: string | null;
  headSha?: string | null;
}) {
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  React.useLayoutEffect(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 6, left: rect.left });
  }, [anchorRef]);

  if (!pos || typeof document === "undefined") return null;

  return createPortal(
    <div style={{ ...s.panel, top: pos.top, left: pos.left }}>
      <div style={s.header}>
        <Icon.ListChecks size={13} />
        <span>
          {totalCount} FINDING{totalCount === 1 ? "" : "S"}
          {contextLabel ? ` ${contextLabel.toUpperCase()}` : ""}
        </span>
      </div>
      <div style={s.list}>
        {isLoading ? (
          <div style={s.empty}>Loading…</div>
        ) : findings.length === 0 ? (
          <div style={s.empty}>No findings.</div>
        ) : (
          findings.map((f) => {
            const fileHref =
              repoFullName && headSha
                ? githubBlobUrl(repoFullName, headSha, f.file, f.start_line, f.end_line)
                : undefined;
            return (
              <div key={f.id} style={s.row}>
                <div style={s.rowHead}>
                  <SeverityBadge severity={f.severity as Severity} compact />
                  <span style={s.title}>{f.title}</span>
                  <CategoryTag category={f.category as Category} />
                </div>
                <div style={s.meta}>
                  <MonoLink href={fileHref}>
                    {f.file}:{lineLabel(f)}
                  </MonoLink>
                  <ConfidenceNum value={f.confidence} />
                </div>
                <p style={s.rationale}>{f.rationale}</p>
              </div>
            );
          })
        )}
      </div>
    </div>,
    document.body,
  );
}

export default FindingsPreviewPopover;
