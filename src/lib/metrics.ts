import { Phone, Calendar, Handshake, Target, LucideIcon } from "lucide-react";

export type MetricDef = { key: string; label: string; icon: LucideIcon; color: string };

// Default suggestions when creating new metrics
export const DEFAULT_METRICS: MetricDef[] = [
  { key: "calls", label: "Calls", icon: Phone, color: "text-info" },
  { key: "meetings", label: "Meetings", icon: Calendar, color: "text-warning" },
  { key: "deals", label: "Deals", icon: Handshake, color: "text-success" },
];

const COLORS = ["text-info", "text-warning", "text-success", "text-primary", "text-destructive"];

/** Build metric definitions dynamically from targets. Falls back to defaults. */
export function getMetricsFromTargets(
  targets: { metric: string; salesperson_id: string | null }[]
): MetricDef[] {
  const teamMetrics = [...new Set(targets.filter((t) => !t.salesperson_id).map((t) => t.metric))];
  if (teamMetrics.length === 0) return DEFAULT_METRICS;

  return teamMetrics.map((key, i) => {
    const def = DEFAULT_METRICS.find((d) => d.key === key);
    return def || { key, label: key, icon: Target, color: COLORS[i % COLORS.length] };
  });
}
