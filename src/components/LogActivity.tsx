import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import confetti from "canvas-confetti";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMetricsFromTargets } from "@/lib/metrics";
import { toast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface LogActivityProps {
  buId: string;
  salespeople: { id: string; name: string }[];
  targets: { metric: string; salesperson_id: string | null; target_value: number }[];
  activityLogs: { metric: string; count: number }[];
}

function fireFireworks() {
  const duration = 4000;
  const end = Date.now() + duration;
  const colors = ["#CA1D34", "#FFD040", "#372E95", "#ff0", "#00ff88", "#ff6600", "#0ff", "#f0f"];

  confetti({ particleCount: 150, spread: 100, startVelocity: 45, origin: { x: 0.5, y: 0.5 }, colors });
  confetti({ particleCount: 100, spread: 160, startVelocity: 55, origin: { x: 0.5, y: 0.4 }, colors });

  const interval = setInterval(() => {
    if (Date.now() > end) return clearInterval(interval);
    confetti({
      particleCount: 40 + Math.random() * 40,
      startVelocity: 25 + Math.random() * 30,
      spread: 80 + Math.random() * 80,
      origin: { x: 0.1 + Math.random() * 0.8, y: Math.random() * 0.5 },
      colors,
      ticks: 200,
    });
  }, 120);
}

export function LogActivity({ buId, salespeople, targets, activityLogs }: LogActivityProps) {
  const metrics = getMetricsFromTargets(targets);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [comment, setComment] = useState("");
  const [loadingMetric, setLoadingMetric] = useState<string | null>(null);
  const qc = useQueryClient();

  const handleLog = async (metricKey: string) => {
    if (!selectedPerson) {
      toast({ title: "Sélectionnez un commercial", variant: "destructive" });
      return;
    }

    setLoadingMetric(metricKey);
    const { error } = await supabase.from("activity_logs").insert({
      bu_id: buId,
      salesperson_id: selectedPerson,
      metric: metricKey,
      count: 1,
      note: comment.trim() || null,
    });
    setLoadingMetric(null);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      const metricLabel = metrics.find((m) => m.key === metricKey)?.label || metricKey;
      toast({ title: `✓ ${metricLabel} enregistré !` });
      setComment("");

      const teamTarget = targets.find((t) => !t.salesperson_id && t.metric === metricKey);
      if (teamTarget && teamTarget.target_value > 0) {
        const currentTotal = activityLogs
          .filter((l) => l.metric === metricKey)
          .reduce((s, l) => s + l.count, 0) + 1;
        if (currentTotal >= teamTarget.target_value) {
          fireFireworks();
          toast({ title: `🎆 Objectif "${metricLabel}" atteint !` });
        } else {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        }
      } else {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      }

      qc.invalidateQueries({ queryKey: ["activity_logs", buId] });
    }
  };

  return (
    <div className="rounded-lg bg-card border border-border shadow-sm p-5">
      <h3 className="font-display font-semibold text-foreground mb-4">Enregistrer une activité</h3>
      {metrics.length === 0 ? (
        <p className="text-sm text-muted-foreground">Configurez d'abord les objectifs via le bouton Manage.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Qui ?</label>
              <Select value={selectedPerson} onValueChange={setSelectedPerson}>
                <SelectTrigger><SelectValue placeholder="Commercial" /></SelectTrigger>
                <SelectContent>
                  {salespeople.map((sp) => (
                    <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Commentaire (optionnel)</label>
              <Input
                placeholder="ex: Client Dupont"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {metrics.map((m) => (
              <Button
                key={m.key}
                variant="outline"
                onClick={() => handleLog(m.key)}
                disabled={loadingMetric === m.key}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                {m.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
