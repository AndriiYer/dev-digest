/* FindingsPanel — hide-low-confidence + j/k navigation + FindingCard list,
   wiring the accept/dismiss action hook (A2). */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Toggle, EmptyState, SeverityBadge, SEV } from "@devdigest/ui";
import type { FindingRecord, Severity } from "@devdigest/shared";
import { FindingCard } from "../FindingCard";
import { useFindingAction } from "../../../../../../../lib/hooks/reviews";
import { KEY_TO_ACTION } from "./constants";
import { visibleFindings, countBySeverity } from "./helpers";
import { s } from "./styles";

/** Chip display order — CRITICAL first, matches SEVERITY_ORDER. */
const SEVERITIES: Severity[] = ["CRITICAL", "WARNING", "SUGGESTION"];

export function FindingsPanel({
  findings,
  prId,
  repoFullName,
  headSha,
}: {
  findings: FindingRecord[];
  prId: string;
  repoFullName?: string | null;
  headSha?: string | null;
}) {
  const t = useTranslations("prReview");
  const action = useFindingAction();
  const [hideLow, setHideLow] = React.useState(false);
  const [severityFilter, setSeverityFilter] = React.useState<Severity | null>(null);
  const [focusIdx, setFocusIdx] = React.useState(0);

  const counts = React.useMemo(() => countBySeverity(findings), [findings]);
  const shown = React.useMemo(
    () => visibleFindings(findings, hideLow, severityFilter),
    [findings, hideLow, severityFilter],
  );

  const toggleSeverity = React.useCallback((sev: Severity) => {
    setSeverityFilter((cur) => (cur === sev ? null : sev));
  }, []);

  // Keep keyboard focus in range when a filter shrinks/changes the list —
  // otherwise `focused` can point past the end and no card highlights.
  React.useEffect(() => {
    setFocusIdx(0);
  }, [hideLow, severityFilter]);

  // j/k navigation + a/d shortcuts on the focused finding (keyboard).
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "j") setFocusIdx((i) => Math.min(i + 1, shown.length - 1));
      else if (e.key === "k") setFocusIdx((i) => Math.max(i - 1, 0));
      else if (KEY_TO_ACTION[e.key] && shown[focusIdx]) {
        action.mutate({ findingId: shown[focusIdx]!.id, action: KEY_TO_ACTION[e.key]!, prId });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shown, focusIdx, action, prId]);

  return (
    <div>
      <div style={s.toolbar}>
        <div style={s.chipsGroup}>
          {SEVERITIES.filter((sev) => counts[sev] > 0).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => toggleSeverity(sev)}
              aria-pressed={severityFilter === sev}
              style={s.severityChip(severityFilter === sev, severityFilter !== null, SEV[sev].c)}
            >
              <SeverityBadge severity={sev} count={counts[sev]} />
            </button>
          ))}
        </div>
        <div style={s.toggleGroup}>
          {t("panel.hideLowConfidence")}
          <Toggle on={hideLow} onChange={setHideLow} size={16} />
        </div>
      </div>

      <div style={s.list}>
        {shown.length === 0 ? (
          <EmptyState icon="Filter" title={t("panel.noMatchTitle")} body={t("panel.noMatchBody")} />
        ) : (
          shown.map((f, i) => (
            <FindingCard
              key={f.id}
              f={f}
              focused={i === focusIdx}
              defaultExpanded={i === 0}
              pending={action.isPending}
              repoFullName={repoFullName}
              headSha={headSha}
              onAction={(act) => action.mutate({ findingId: f.id, action: act, prId })}
            />
          ))
        )}
      </div>
    </div>
  );
}
