import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Settings2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ManageTeamProps {
  buId: string;
  sessionObjective: string | null;
  salespeople: { id: string; name: string }[];
  targets: { id: string; bu_id: string; salesperson_id: string | null; metric: string; target_value: number; points_per_unit: number }[];
}

export function ManageTeam({ buId, sessionObjective, salespeople, targets }: ManageTeamProps) {
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [objective, setObjective] = useState(sessionObjective || "");
  const qc = useQueryClient();

  // Build editable metrics from existing team targets
  const teamTargets = targets.filter((t) => !t.salesperson_id);
  const [metrics, setMetrics] = useState<{ name: string; value: string; points: string }[]>(() =>
    teamTargets.length > 0
      ? teamTargets.map((t) => ({ name: t.metric, value: String(t.target_value), points: String(t.points_per_unit) }))
      : [{ name: "", value: "", points: "1" }]
  );

  const addPerson = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("salespeople").insert({ bu_id: buId, name: newName.trim() });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewName("");
      qc.invalidateQueries({ queryKey: ["salespeople", buId] });
      toast({ title: `Added ${newName.trim()}!` });
    }
  };

  const saveAll = async () => {
    setLoading(true);

    // Save session objective
    await supabase.from("business_units").update({ session_objective: objective.trim() || null }).eq("id", buId);

    // Save custom metric targets
    const validMetrics = metrics.filter((m) => m.name.trim() && parseInt(m.value || "0", 10) > 0);

    // Delete old team targets that are no longer in the list
    const oldIds = teamTargets
      .filter((t) => !validMetrics.find((m) => m.name.trim().toLowerCase() === t.metric.toLowerCase()))
      .map((t) => t.id);
    if (oldIds.length > 0) {
      await supabase.from("targets").delete().in("id", oldIds);
    }

    // Upsert current metrics
    for (const m of validMetrics) {
      const key = m.name.trim().toLowerCase();
      const val = parseInt(m.value, 10);
      const existing = teamTargets.find((t) => t.metric.toLowerCase() === key);
      if (existing) {
        await supabase.from("targets").update({ target_value: val, metric: key }).eq("id", existing.id);
      } else {
        await supabase.from("targets").insert({ bu_id: buId, salesperson_id: null, metric: key, target_value: val });
      }
    }

    qc.invalidateQueries({ queryKey: ["bu"] });
    qc.invalidateQueries({ queryKey: ["targets", buId] });
    setLoading(false);
    toast({ title: "Settings saved!" });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" /> Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Session Setup</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Session Objective */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Session Objective</h4>
            <Textarea
              placeholder="Ex: Reconquérir les clients inactifs depuis 6 mois..."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
            />
          </div>

          {/* Custom Metrics */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Targets</h4>
            <div className="space-y-2">
              {metrics.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Metric name (e.g. clients contactés)"
                    value={m.name}
                    onChange={(e) => {
                      const copy = [...metrics];
                      copy[i] = { ...copy[i], name: e.target.value };
                      setMetrics(copy);
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Target"
                    value={m.value}
                    onChange={(e) => {
                      const copy = [...metrics];
                      copy[i] = { ...copy[i], value: e.target.value };
                      setMetrics(copy);
                    }}
                    className="w-20"
                  />
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      placeholder="Pts"
                      value={m.points}
                      onChange={(e) => {
                        const copy = [...metrics];
                        copy[i] = { ...copy[i], points: e.target.value };
                        setMetrics(copy);
                      }}
                      className="w-16"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">pts</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMetrics(metrics.filter((_, j) => j !== i))}
                    disabled={metrics.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setMetrics([...metrics, { name: "", value: "" }])}
            >
              <Plus className="h-4 w-4 mr-1" /> Add metric
            </Button>
          </div>

          {/* Add Salesperson */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Add Salesperson</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPerson()}
              />
              <Button onClick={addPerson} disabled={loading} size="icon">
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
            {salespeople.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {salespeople.map((sp) => (
                  <span key={sp.id} className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                    {sp.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button onClick={saveAll} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
