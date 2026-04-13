import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { METRICS } from "@/lib/metrics";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Crown, Zap } from "lucide-react";

function useHQData() {
  const bus = useQuery({
    queryKey: ["all-bus"],
    queryFn: async () => {
      const { data, error } = await supabase.from("business_units").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  const salespeople = useQuery({
    queryKey: ["all-salespeople"],
    queryFn: async () => {
      const { data, error } = await supabase.from("salespeople").select("*");
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  const targets = useQuery({
    queryKey: ["all-targets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("targets").select("*");
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  const logs = useQuery({
    queryKey: ["all-activity-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_logs").select("*");
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  return { bus, salespeople, targets, logs };
}

export default function HQDashboard() {
  const { bus, salespeople, targets, logs } = useHQData();

  const allBus = bus.data ?? [];
  const allSalespeople = salespeople.data ?? [];
  const allTargets = targets.data ?? [];
  const allLogs = logs.data ?? [];

  const isLoading = bus.isLoading || salespeople.isLoading || targets.isLoading || logs.isLoading;

  // Global totals
  const globalTotals = METRICS.map((m) => {
    const current = allLogs
      .filter((l) => l.metric === m.key)
      .reduce((sum, l) => sum + l.count, 0);
    const target = allTargets
      .filter((t) => !t.salesperson_id && t.metric === m.key)
      .reduce((sum, t) => sum + t.target_value, 0);
    return { ...m, current, target };
  });

  // Per-BU breakdown
  const buStats = allBus.map((bu) => {
    const buLogs = allLogs.filter((l) => l.bu_id === bu.id);
    const buTargets = allTargets.filter((t) => t.bu_id === bu.id && !t.salesperson_id);
    const buPeople = allSalespeople.filter((sp) => sp.bu_id === bu.id);

    const metrics = METRICS.map((m) => {
      const current = buLogs.filter((l) => l.metric === m.key).reduce((s, l) => s + l.count, 0);
      const target = buTargets.find((t) => t.metric === m.key)?.target_value || 0;
      return { ...m, current, target };
    });

    return { ...bu, metrics, headcount: buPeople.length };
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse font-display text-lg text-muted-foreground">Loading HQ view...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              <span className="font-display font-bold text-foreground">Sales Blitz</span>
            </Link>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5">
              <Crown className="h-4 w-4 text-warning" />
              <span className="font-display font-semibold text-foreground">HQ Dashboard</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{allBus.length} BUs · {allSalespeople.length} reps</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Global totals */}
        <div>
          <h2 className="font-display font-semibold text-foreground mb-3">Global Progress</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {globalTotals.map(({ key, label, icon: Icon, color, current, target }) => {
              const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
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
                        {target > 0 && <span className="text-sm font-normal text-muted-foreground"> / {target}</span>}
                      </p>
                    </div>
                  </div>
                  {target > 0 && (
                    <div>
                      <Progress value={pct} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{Math.round(pct)}% of target</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-BU cards */}
        <div>
          <h2 className="font-display font-semibold text-foreground mb-3">By Business Unit</h2>
          {allBus.length === 0 ? (
            <p className="text-muted-foreground text-sm">No business units created yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {buStats.map((bu) => (
                <Link
                  key={bu.id}
                  to={`/bu/${bu.slug}`}
                  className="rounded-lg bg-card border border-border shadow-sm p-5 hover:border-primary/40 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-display font-semibold text-foreground">{bu.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{bu.headcount} reps</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {bu.metrics.map((m) => {
                      const pct = m.target > 0 ? Math.min((m.current / m.target) * 100, 100) : 0;
                      return (
                        <div key={m.key}>
                          <div className="flex items-center gap-1 mb-1">
                            <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                            <span className="text-xs text-muted-foreground">{m.label}</span>
                          </div>
                          <p className="font-display font-bold text-foreground text-sm">
                            {m.current}
                            {m.target > 0 && <span className="text-xs font-normal text-muted-foreground"> /{m.target}</span>}
                          </p>
                          {m.target > 0 && <Progress value={pct} className="h-1 mt-1" />}
                        </div>
                      );
                    })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
