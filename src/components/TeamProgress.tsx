import { getMetricsFromTargets, MetricDef } from "@/lib/metrics";
import { Progress } from "@/components/ui/progress";

interface TeamProgressProps {
  targets: { metric: string; target_value: number; salesperson_id: string | null }[];
  activityLogs: { metric: string; count: number }[];
}

export function TeamProgress({ targets, activityLogs }: TeamProgressProps) {
  const metrics = getMetricsFromTargets(targets);
  const teamTargets = targets.filter((t) => !t.salesperson_id);
  const totalsByMetric = activityLogs.reduce<Record<string, number>>((acc, log) => {
    acc[log.metric] = (acc[log.metric] || 0) + log.count;
    return acc;
  }, {});

  if (metrics.length === 0) {
    return (
      <div className="rounded-lg bg-muted/40 border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">No targets defined yet. Click <span className="font-semibold text-foreground">Setup</span> in the top-right to configure session metrics.</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${metrics.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
      {metrics.map(({ key, label, icon: Icon, color }) => {
        const target = teamTargets.find((t) => t.metric === key);
        const current = totalsByMetric[key] || 0;
        const targetVal = target?.target_value || 0;
        const pct = targetVal > 0 ? (current / targetVal) * 100 : 0;

        return (
          <div key={key} className="rounded-lg bg-card p-5 shadow-sm border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className={`rounded-md p-2 bg-muted ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {current}
                  {targetVal > 0 && (
                    <span className="text-sm font-normal text-muted-foreground"> / {targetVal}</span>
                  )}
                </p>
              </div>
            </div>
            {targetVal > 0 && (
              <div>
                <Progress value={Math.min(pct, 100)} className="h-2 [&>div]:bg-success" />
                <p className={`text-xs mt-1 ${pct >= 100 ? "text-primary font-semibold" : "text-muted-foreground"}`}>{Math.round(pct)}% of target</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
