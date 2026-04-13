import { METRICS, MetricType } from "@/lib/metrics";
import { Trophy } from "lucide-react";

interface LeaderboardProps {
  salespeople: { id: string; name: string }[];
  activityLogs: { salesperson_id: string; metric: string; count: number }[];
  targets: { salesperson_id: string | null; metric: string; target_value: number }[];
}

export function Leaderboard({ salespeople, activityLogs, targets }: LeaderboardProps) {
  const totals = salespeople.map((sp) => {
    const spLogs = activityLogs.filter((l) => l.salesperson_id === sp.id);
    const byMetric: Record<string, number> = {};
    spLogs.forEach((l) => {
      byMetric[l.metric] = (byMetric[l.metric] || 0) + l.count;
    });
    const totalCalls = byMetric["calls"] || 0;
    return { ...sp, byMetric, totalCalls };
  });

  totals.sort((a, b) => b.totalCalls - a.totalCalls);

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
              {METRICS.map((m) => (
                <th key={m.key} className="text-center p-3 font-medium text-muted-foreground">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {totals.map((sp, i) => (
              <tr key={sp.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-3 font-display font-bold text-muted-foreground">{i + 1}</td>
                <td className="p-3 font-medium text-foreground">{sp.name}</td>
                {METRICS.map((m) => {
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
              </tr>
            ))}
            {totals.length === 0 && (
              <tr>
                <td colSpan={2 + METRICS.length} className="p-6 text-center text-muted-foreground">
                  No salespeople yet. Add your team below!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
