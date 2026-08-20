/* Shared cost pill for agent-run cost display. Thin wrapper over the shared
   `Badge` primitive (same one drawing the status/size badges on these same
   screens) rather than bespoke markup — two variants: `compact` for the PR
   list's COST column, `detailed` for the run timeline row. */
import { Badge } from "@devdigest/ui";
import { formatCost } from "@/lib/format-cost";

export function RunCostBadge({
  costUsd,
  variant = "compact",
}: {
  costUsd: number | null | undefined;
  variant?: "compact" | "detailed";
}) {
  const label = formatCost(costUsd);
  return variant === "compact" ? (
    <Badge mono color="var(--text-secondary)" bg="transparent" style={{ padding: "2px 6px" }}>
      {label}
    </Badge>
  ) : (
    <Badge mono color="var(--text-muted)" bg="var(--bg-hover)">
      {label}
    </Badge>
  );
}

export default RunCostBadge;
