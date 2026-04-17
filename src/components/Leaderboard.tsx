import { getMetricsFromTargets } from "@/lib/metrics";
import { Trophy } from "lucide-react";

interface LeaderboardProps {
  salespeople: { id: string; name: string }[];
  activityLogs: { salesperson_id: string; metric: string; count: number }[];
  targets: { salesperson_id: string | null; metric: string; target_value: number; points_per_unit: number }[];
}

export function Leaderboard({ salespeople, activityLogs, targets }: LeaderboardProps) {
  const metrics = getMetricsFromTargets(targets);
  const teamTargets = targets.filter((t) => !t.salesperson_id);

  // Build a map of metric -> points_per_unit
  const pointsMap: Record<string, number> = {};
  teamTargets.forEach((t) => {
    pointsMap[t.metric] = t.points_per_unit ?? 1;
  });

  const totals = salespeople.map((sp) => {
    const spLogs = activityLogs.filter((l) => l.salesperson_id === sp.id);
    const byMetric: Record<string, number> = {};
    let score = 0;
    spLogs.forEach((l) => {
      byMetric[l.metric] = (byMetric[l.metric] || 0) + l.count;
      score += l.count * (pointsMap[l.metric] ?? 1);
    });
    return { ...sp, byMetric, score };
  });

  totals.sort((a, b) => b.score - a.score);

  return (
    <div className="rounded-lg bg-card border border-border shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Trophy className="h-5 w-5 text-warning" />
        <h3 className="font-display font-semibold text-foreground">Leaderboard</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">#</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              {metrics.map((m) => (
                <th key={m.key} className="text-center p-3 font-medium text-muted-foreground">
                  {m.label}
                  <span className="block text-xs font-normal">×{pointsMap[m.key] ?? 1}pt</span>
                </th>
              ))}
              <th className="text-center p-3 font-medium text-foreground">Score</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((sp, i) => (
              <tr key={sp.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-3 font-display font-bold text-muted-foreground">{i + 1}</td>
                <td className="p-3 font-medium text-foreground">{sp.name}</td>
                {metrics.map((m) => {
                  const val = sp.byMetric[m.key] || 0;
                  const target = targets.find(
                    (t) => t.salesperson_id === sp.id && t.metric === m.key
                  );
                  return (
                    <td key={m.key} className="text-center p-3">
                      <span className="font-display font-semibold">{val}</span>
                      {target && (
                        <span className="text-muted-foreground text-xs"> /{target.target_value}</span>
                      )}
                    </td>
                  );
                })}
                <td className="text-center p-3">
                  <span className="font-display font-bold text-primary">{sp.score}</span>
                </td>
              </tr>
            ))}
            {totals.length === 0 && (
              <tr>
                <td colSpan={3 + metrics.length} className="p-6 text-center text-muted-foreground">
                  No salespeople yet. Click <span className="font-semibold text-foreground">Setup</span> in the top-right to add team members.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
