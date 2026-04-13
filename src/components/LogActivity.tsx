import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import confetti from "canvas-confetti";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMetricsFromTargets } from "@/lib/metrics";
import { toast } from "@/hooks/use-toast";

interface CustomField {
  name: string;
  type: string;
  required: boolean;
}

interface LogActivityProps {
  buId: string;
  salespeople: { id: string; name: string }[];
  targets: { metric: string; salesperson_id: string | null; target_value: number; custom_fields?: any }[];
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
    confetti({
      particleCount: 20 + Math.random() * 30,
      startVelocity: 35 + Math.random() * 25,
      spread: 120,
      origin: { x: Math.random(), y: Math.random() * 0.3 },
      colors,
      ticks: 300,
      gravity: 0.8,
    });
  }, 120);
}

export function LogActivity({ buId, salespeople, targets, activityLogs }: LogActivityProps) {
  const metrics = getMetricsFromTargets(targets);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<string>(metrics[0]?.key || "");
  const [fieldsValues, setFieldsValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  // Get custom fields for the selected metric
  const customFields: CustomField[] = useMemo(() => {
    const target = targets.find((t) => !t.salesperson_id && t.metric === selectedMetric);
    const cf = (target as any)?.custom_fields;
    return Array.isArray(cf) ? cf : [];
  }, [targets, selectedMetric]);

  const handleMetricChange = (value: string) => {
    setSelectedMetric(value);
    setFieldsValues({});
  };

  const handleSubmit = async () => {
    if (!selectedPerson) {
      toast({ title: "Sélectionnez un commercial", variant: "destructive" });
      return;
    }
    if (!selectedMetric) {
      toast({ title: "Sélectionnez une métrique", variant: "destructive" });
      return;
    }

    // Validate required custom fields
    for (const f of customFields) {
      if (f.required && !fieldsValues[f.name]?.trim()) {
        toast({ title: `Le champ "${f.name}" est requis`, variant: "destructive" });
        return;
      }
    }

    // Build fields_data and note
    let fieldsData: Record<string, any> | null = null;
    let note: string | null = null;

    if (customFields.length > 0) {
      fieldsData = Object.fromEntries(
        customFields.map((f) => [f.name, f.type === "number" ? Number(fieldsValues[f.name] || 0) : (fieldsValues[f.name] || "").trim()])
      );
      note = customFields.map((f) => `${f.name}: ${fieldsValues[f.name] || ""}`).join(" | ");
    } else {
      note = (fieldsValues["__note"] || "").trim() || null;
    }

    setLoading(true);
    const { error } = await supabase.from("activity_logs").insert({
      bu_id: buId,
      salesperson_id: selectedPerson,
      metric: selectedMetric,
      count: 1,
      note,
      fields_data: fieldsData,
    } as any);
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      const metricLabel = metrics.find((m) => m.key === selectedMetric)?.label || selectedMetric;
      toast({ title: `✓ ${metricLabel} enregistré !` });
      setFieldsValues({});

      const teamTarget = targets.find((t) => !t.salesperson_id && t.metric === selectedMetric);
      if (teamTarget && teamTarget.target_value > 0) {
        const currentTotal = activityLogs
          .filter((l) => l.metric === selectedMetric)
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
              <Select value={selectedMetric} onValueChange={handleMetricChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {metrics.map((m) => (
                    <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dynamic custom fields */}
          {customFields.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {customFields.map((f) => (
                <div key={f.name}>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {f.name} {f.required && <span className="text-destructive">*</span>}
                  </label>
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    placeholder={f.name}
                    value={fieldsValues[f.name] || ""}
                    onChange={(e) => setFieldsValues({ ...fieldsValues, [f.name]: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Commentaire (optionnel)</label>
              <Input
                placeholder="ex: Client Dupont, offre 12K€"
                value={fieldsValues["__note"] || ""}
                onChange={(e) => setFieldsValues({ ...fieldsValues, __note: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
          )}

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "..." : "Enregistrer"}
          </Button>
        </div>
      )}
    </div>
  );
}
