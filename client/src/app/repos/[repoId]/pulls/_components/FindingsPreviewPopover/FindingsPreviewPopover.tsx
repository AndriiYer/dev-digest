/* FindingsPreviewPopover — click-through preview of one severity's findings,
   triggered from a PR-list row's FINDINGS badges. Lazily fetches (only mounts
   while a badge is toggled open) via the same GET /pulls/:id/reviews the PR
   detail page uses; takes the LATEST review, same convention already used for
   the list's score/cost/findings-count columns.

   Rendered via a portal to document.body: the PR list's table card clips
   overflow (for its rounded corners), which would otherwise clip this panel
   since it needs to render below the row it's anchored to. */
"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Icon, SeverityBadge, CategoryTag, MonoLink, ConfidenceNum, type Severity, type Category } from "@devdigest/ui";
import type { FindingRecord } from "@devdigest/shared";
import { usePrReviews } from "@/lib/hooks/reviews";
import { s } from "./styles";

function lineLabel(f: Pick<FindingRecord, "start_line" | "end_line">): string {
  return f.start_line === f.end_line ? `${f.start_line}` : `${f.start_line}-${f.end_line}`;
}

export function FindingsPreviewPopover({
  prId,
  severity,
  anchorRef,
}: {
  prId: string;
  severity: Severity;
  /** Positions the (portaled, fixed) panel just below this element. */
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const { data: reviews, isLoading } = usePrReviews(prId);
  const findings = (reviews?.[0]?.findings ?? []).filter((f) => f.severity === severity);

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
          {findings.length} FINDING{findings.length === 1 ? "" : "S"}
        </span>
      </div>
      <div style={s.list}>
        {isLoading ? (
          <div style={s.empty}>Loading…</div>
        ) : findings.length === 0 ? (
          <div style={s.empty}>No findings.</div>
        ) : (
          findings.map((f) => (
            <div key={f.id} style={s.row}>
              <div style={s.rowHead}>
                <SeverityBadge severity={f.severity as Severity} compact />
                <span style={s.title}>{f.title}</span>
                <CategoryTag category={f.category as Category} />
              </div>
              <div style={s.meta}>
                <MonoLink>
                  {f.file}:{lineLabel(f)}
                </MonoLink>
                <ConfidenceNum value={f.confidence} />
              </div>
              <p style={s.rationale}>{f.rationale}</p>
            </div>
          ))
        )}
      </div>
    </div>,
    document.body,
  );
}

export default FindingsPreviewPopover;
