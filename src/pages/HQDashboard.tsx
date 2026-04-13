import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMetricsFromTargets } from "@/lib/metrics";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Building2, Crown, Zap, Plus, Copy, Download } from "lucide-react";
import { exportHQToExcel } from "@/lib/exportBU";

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
  const queryClient = useQueryClient();
  const [buName, setBuName] = useState("");
  const [creating, setCreating] = useState(false);

  const allBus = bus.data ?? [];
  const allSalespeople = salespeople.data ?? [];
  const allTargets = targets.data ?? [];
  const allLogs = logs.data ?? [];

  const isLoading = bus.isLoading || salespeople.isLoading || targets.isLoading || logs.isLoading;


  const buStats = allBus.map((bu) => {
    const buLogs = allLogs.filter((l) => l.bu_id === bu.id);
    const buTargets = allTargets.filter((t) => t.bu_id === bu.id && !t.salesperson_id);
    const buPeople = allSalespeople.filter((sp) => sp.bu_id === bu.id);
    const buMetrics = getMetricsFromTargets(buTargets);

    const metrics = buMetrics.map((m) => {
      const current = buLogs.filter((l) => l.metric === m.key).reduce((s, l) => s + l.count, 0);
      const target = buTargets.find((t) => t.metric === m.key)?.target_value || 0;
      return { ...m, current, target };
    });

    return { ...bu, metrics, headcount: buPeople.length };
  });

  const createBU = async () => {
    if (!buName.trim()) return;
    const slug = buName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setCreating(true);
    const { error } = await supabase.from("business_units").insert({ name: buName.trim(), slug });
    setCreating(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Ce nom existe déjà", description: "Essayez un autre nom.", variant: "destructive" });
      } else {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      }
    } else {
      setBuName("");
      queryClient.invalidateQueries({ queryKey: ["all-bus"] });
      toast({ title: "BU créée", description: `Le lien est /bu/${slug}` });
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/bu/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Lien copié !" });
  };

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
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{allBus.length} BUs · {allSalespeople.length} reps</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportHQToExcel(allBus, allSalespeople, allTargets, allLogs)}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Create new BU */}
        <div className="rounded-lg bg-card border border-border shadow-sm p-5">
          <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Créer une nouvelle BU
          </h2>
          <div className="flex gap-2">
            <Input
              placeholder="Nom de la Business Unit"
              value={buName}
              onChange={(e) => setBuName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createBU()}
              className="flex-1"
            />
            <Button onClick={createBU} disabled={creating}>
              Créer
            </Button>
          </div>
        </div>

        {/* Per-BU cards */}
        <div>
          <h2 className="font-display font-semibold text-foreground mb-3">Par Business Unit</h2>
          {allBus.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune BU créée pour le moment.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {buStats.map((bu) => (
                <div
                  key={bu.id}
                  className="rounded-lg bg-card border border-border shadow-sm p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-display font-semibold text-foreground">{bu.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{bu.headcount} reps</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyLink(bu.slug)}
                        title="Copier le lien"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Link to={`/bu/${bu.slug}`}>
                        <ArrowRight className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                      </Link>
                    </div>
                  </div>
                  {bu.session_objective && (
                    <p className="text-xs text-muted-foreground mb-3 italic line-clamp-1">{bu.session_objective}</p>
                  )}
                  <div className={`grid gap-3 ${bu.metrics.length <= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
