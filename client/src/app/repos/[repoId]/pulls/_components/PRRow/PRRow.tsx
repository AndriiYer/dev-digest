/* PRRow — one clickable row in the PR list table. Ported from screen_dashboard.jsx. */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, Avatar, Badge, CircularScore, SeverityBadge } from "@devdigest/ui";
import type { PrMeta } from "@/lib/types";
import type { Severity } from "@devdigest/shared";
import { RunCostBadge } from "@/components/run-cost-badge";
import { FindingsPreviewPopover } from "../FindingsPreviewPopover";
import { SIZE_COLOR, STATUS_META } from "../../constants";
import { relativeTime, sizeOf } from "../../helpers";
import { s } from "../../styles";

/** Chip display order — CRITICAL first. */
const SEVERITIES: Severity[] = ["CRITICAL", "WARNING", "SUGGESTION"];

export function PRRow({ pr, repoId }: { pr: PrMeta; repoId: string }) {
  const t = useTranslations("prReview");
  const router = useRouter();
  const [h, setH] = React.useState(false);
  const st = STATUS_META[pr.status] ?? STATUS_META.needs_review!;
  const { size, lines } = sizeOf(pr);
  const reviewed = pr.score != null; // null score ⇒ PR has never been reviewed

  // Click a FINDINGS badge → preview popover for just that severity. Exclusive
  // (clicking the active badge again closes it); listeners that only exist
  // while a popover is open close it on an outside click or on scroll (the
  // popover's position is computed once on open, via a portal — see
  // FindingsPreviewPopover — so it won't track scroll on its own).
  const [openSeverity, setOpenSeverity] = React.useState<Severity | null>(null);
  const findingsCellRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!openSeverity) return;
    const onOutside = (e: MouseEvent) => {
      if (findingsCellRef.current && !findingsCellRef.current.contains(e.target as Node)) {
        setOpenSeverity(null);
      }
    };
    const onScroll = () => setOpenSeverity(null);
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [openSeverity]);
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={() => router.push(`/repos/${repoId}/pulls/${pr.number}`)}
      style={s.row(h)}
    >
      <div style={s.rowTitleCell}>
        <Icon.GitPullRequest size={15} style={s.rowIcon(st.c)} />
        <div style={s.rowTitleWrap}>
          <div style={s.rowTitle(h)}>{pr.title}</div>
          <span className="mono" style={s.rowNumber}>
            #{pr.number}
          </span>
        </div>
      </div>
      <div style={s.authorCell}>
        <Avatar name={pr.author} size={18} />
        {pr.author}
      </div>
      <div>
        <Badge
          color={SIZE_COLOR[size]}
          bg="transparent"
          style={s.sizeBadgeBorder(SIZE_COLOR[size]!)}
        >
          {size} · {lines}
        </Badge>
      </div>
      <div style={s.scoreCell}>
        {reviewed ? (
          <CircularScore score={pr.score!} size={34} stroke={3} />
        ) : (
          <span style={s.muted}>—</span>
        )}
      </div>
      <div style={s.findingsCell}>
        {pr.findings_by_severity == null ? (
          <span style={s.muted}>—</span>
        ) : (
          <div ref={findingsCellRef} onClick={(e) => e.stopPropagation()} style={s.findingsChips}>
            {SEVERITIES.map((sev) => {
              const count = pr.findings_by_severity![sev];
              return (
                <button
                  key={sev}
                  type="button"
                  disabled={count === 0}
                  onClick={() => setOpenSeverity((cur) => (cur === sev ? null : sev))}
                  style={s.findingsBadgeBtn(count === 0)}
                >
                  <SeverityBadge severity={sev} count={count} compact />
                </button>
              );
            })}
            {openSeverity && pr.id && (
              <FindingsPreviewPopover prId={pr.id} severity={openSeverity} anchorRef={findingsCellRef} />
            )}
          </div>
        )}
      </div>
      <div>
        <Badge dot color={st.c} bg="transparent">
          {t(`list.status.${st.labelKey}`)}
        </Badge>
      </div>
      <div style={s.costCell}>
        <RunCostBadge costUsd={pr.cost_usd} variant="compact" />
      </div>
      <div style={s.updatedCell}>{relativeTime(pr.updated_at)}</div>
    </div>
  );
}
