import { Clock } from "lucide-react";

interface ActivityFeedProps {
  activityLogs: {
    id: string;
    salesperson_id: string;
    metric: string;
    count: number;
    logged_at: string;
    note?: string | null;
    fields_data?: Record<string, any> | null;
  }[];
  salespeople: { id: string; name: string }[];
}

export function ActivityFeed({ activityLogs, salespeople }: ActivityFeedProps) {
  const spMap = Object.fromEntries(salespeople.map((sp) => [sp.id, sp.name]));

  if (activityLogs.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg bg-card border border-border shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-display font-semibold text-foreground">Historique d'activité</h3>
        <span className="text-xs text-muted-foreground ml-auto">{activityLogs.length} entrées</span>
      </div>
      <div className="divide-y divide-border max-h-80 overflow-y-auto">
        {activityLogs.map((log) => {
          const time = new Date(log.logged_at).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const name = spMap[log.salesperson_id] || "Inconnu";
          const fd = log.fields_data as Record<string, any> | null;

          return (
            <div key={log.id} className="px-4 py-3 flex items-start gap-3 text-sm hover:bg-muted/30 transition-colors">
              <span className="text-xs text-muted-foreground font-mono mt-0.5 shrink-0">{time}</span>
              <div>
                <span className="font-medium text-foreground">{name}</span>
                <span className="text-muted-foreground"> a ajouté </span>
                <span className="font-medium text-foreground">"{log.metric}"</span>
                {fd && Object.keys(fd).length > 0 ? (
                  <span className="text-muted-foreground">
                    {" — "}
                    {Object.entries(fd).map(([k, v], i) => (
                      <span key={k}>
                        {i > 0 && " · "}
                        <span className="text-xs font-medium text-foreground">{k}:</span>{" "}
                        <span className="italic">{String(v)}</span>
                      </span>
                    ))}
                  </span>
                ) : log.note ? (
                  <>
                    <span className="text-muted-foreground"> — </span>
                    <span className="italic text-muted-foreground">{log.note}</span>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
