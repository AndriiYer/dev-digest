/**
 * Shared USD cost formatter for agent-run cost display (PR list, run
 * timeline, run trace sidebar). Adaptive precision (~2 significant figures,
 * never fewer than 2 decimals) rather than a fixed decimal count, so both
 * sub-cent per-run costs and larger totals read cleanly:
 *   0.0013 -> "$0.0013", 0.06 -> "$0.06", 0.014 -> "$0.014", 1.2 -> "$1.20"
 *
 * `null`/`undefined` -> "—" (not computed: unknown model, or the run never
 * reached 'done'). Exactly `0` -> "$0.00" (a genuinely free model), distinct
 * from "not computed".
 */
export function formatCost(usd: number | null | undefined): string {
  if (usd == null) return "—";
  if (usd === 0) return "$0.00";
  const decimals = Math.max(2, 1 - Math.floor(Math.log10(Math.abs(usd))));
  let s = usd.toFixed(decimals);
  while (s.endsWith("0") && s.split(".")[1]!.length > 2) s = s.slice(0, -1);
  return `$${s}`;
}
