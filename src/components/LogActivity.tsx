import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import confetti from "canvas-confetti";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMetricsFromTargets } from "@/lib/metrics";
import { toast } from "@/hooks/use-toast";

interface LogActivityProps {
  buId: string;
  salespeople: { id: string; name: string }[];
  targets: { metric: string; salesperson_id: string | null; target_value: number }[];
}

export function LogActivity({ buId, salespeople, targets }: LogActivityProps) {
  const metrics = getMetricsFromTargets(targets);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<string>(metrics[0]?.key || "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const handleSubmit = async () => {
    if (!selectedPerson) {
      toast({ title: "Sélectionnez un commercial", variant: "destructive" });
      return;
    }
    if (!selectedMetric) {
      toast({ title: "Sélectionnez une métrique", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("activity_logs").insert({
      bu_id: buId,
      salesperson_id: selectedPerson,
      metric: selectedMetric,
      count: 1,
      note: note.trim() || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      const metricLabel = metrics.find((m) => m.key === selectedMetric)?.label || selectedMetric;
      toast({ title: `✓ ${metricLabel} enregistré !` });
      setNote("");
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
          <div className="flex flex-wrap gap-3">
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
            <div className="min-w-[130px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Quoi ?</label>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {metrics.map((m) => (
                    <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Commentaire (optionnel)</label>
            <Input
              placeholder="ex: Client Dupont, offre 12K€"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "..." : "Enregistrer"}
          </Button>
        </div>
      )}
    </div>
  );
}
