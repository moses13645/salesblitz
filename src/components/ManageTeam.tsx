import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Settings2, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ManageTeamProps {
  buId: string;
  sessionObjective: string | null;
  sessionDurationMinutes: number | null;
  sessionPhases: { name: string; durationMinutes: number }[] | null;
  salespeople: { id: string; name: string }[];
  targets: { id: string; bu_id: string; salesperson_id: string | null; metric: string; target_value: number; points_per_unit: number; custom_fields?: any }[];
  autoOpen?: boolean;
}

export function ManageTeam({ buId, sessionObjective, sessionDurationMinutes, sessionPhases, salespeople, targets, autoOpen }: ManageTeamProps) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [personToDelete, setPersonToDelete] = useState<{ id: string; name: string } | null>(null);
  const [objective, setObjective] = useState(sessionObjective || "");
  const [phases, setPhases] = useState<{ name: string; duration: string }[]>(() => {
    if (sessionPhases && sessionPhases.length > 0) {
      return sessionPhases.map(p => ({ name: p.name, duration: String(p.durationMinutes) }));
    }
    if (sessionDurationMinutes) {
      return [{ name: "Session", duration: String(sessionDurationMinutes) }];
    }
    return [{ name: "Session 1", duration: "" }, { name: "Débrief", duration: "" }, { name: "Session 2", duration: "" }];
  });
  const qc = useQueryClient();

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

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    const { error } = await supabase.from("salespeople").update({ name }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      qc.invalidateQueries({ queryKey: ["salespeople", buId] });
      toast({ title: "Salesperson updated" });
      cancelEdit();
    }
  };

  const removePerson = async (id: string, name: string) => {
    await supabase.from("activity_logs").delete().eq("salesperson_id", id);
    await supabase.from("targets").delete().eq("salesperson_id", id);
    const { error } = await supabase.from("salespeople").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      qc.invalidateQueries({ queryKey: ["salespeople", buId] });
      qc.invalidateQueries({ queryKey: ["activity_logs", buId] });
      qc.invalidateQueries({ queryKey: ["targets", buId] });
      toast({ title: `${name} removed` });
    }
    setPersonToDelete(null);
  };

  const saveAll = async () => {
    setLoading(true);

    const validPhases = phases
      .filter(p => p.name.trim() && parseInt(p.duration, 10) > 0)
      .map(p => ({ name: p.name.trim(), durationMinutes: parseInt(p.duration, 10) }));

    const totalDuration = validPhases.reduce((sum, p) => sum + p.durationMinutes, 0);

    await supabase.from("business_units").update({
      session_objective: objective.trim() || null,
      session_duration_minutes: totalDuration > 0 ? totalDuration : null,
      session_phases: validPhases.length > 0 ? validPhases : null,
    } as any).eq("id", buId);

    const validMetrics = metrics.filter((m) => m.name.trim() && parseInt(m.value || "0", 10) > 0);

    const oldIds = teamTargets
      .filter((t) => !validMetrics.find((m) => m.name.trim().toLowerCase() === t.metric.toLowerCase()))
      .map((t) => t.id);
    if (oldIds.length > 0) {
      await supabase.from("targets").delete().in("id", oldIds);
    }

    for (const m of validMetrics) {
      const key = m.name.trim().toLowerCase();
      const val = parseInt(m.value, 10);
      const pts = parseInt(m.points || "1", 10) || 1;
      const existing = teamTargets.find((t) => t.metric.toLowerCase() === key);
      if (existing) {
        await supabase.from("targets").update({ target_value: val, metric: key, points_per_unit: pts, custom_fields: null } as any).eq("id", existing.id);
      } else {
        await supabase.from("targets").insert({ bu_id: buId, salesperson_id: null, metric: key, target_value: val, points_per_unit: pts, custom_fields: null } as any);
      }
    }

    qc.invalidateQueries({ queryKey: ["bu"] });
    qc.invalidateQueries({ queryKey: ["targets", buId] });
    setLoading(false);
    toast({ title: "Settings saved!" });
  };

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" /> Setup
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
              placeholder="E.g.: Win back inactive clients from the last 6 months..."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
            />
          </div>

          {/* Session Phases */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Session Phases</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Configure the phase sequence (e.g. Session 1 → Debrief → Session 2).
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-1">
                <span className="flex-1">Phase Name</span>
                <span className="w-24 text-center">Duration (min)</span>
                <span className="w-9" />
              </div>
              {phases.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="ex: Session 1"
                    value={p.name}
                    onChange={(e) => {
                      const copy = [...phases];
                      copy[i] = { ...copy[i], name: e.target.value };
                      setPhases(copy);
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder="45"
                    value={p.duration}
                    onChange={(e) => {
                      const copy = [...phases];
                      copy[i] = { ...copy[i], duration: e.target.value };
                      setPhases(copy);
                    }}
                    className="w-24"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPhases(phases.filter((_, j) => j !== i))}
                    disabled={phases.length <= 1}
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
              onClick={() => setPhases([...phases, { name: "", duration: "" }])}
            >
              <Plus className="h-4 w-4 mr-1" /> Add phase
            </Button>
          </div>

          {/* Metrics */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Session Targets</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Define the metrics to track, the team target, and points per unit.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-1">
                <span className="flex-1">Metric</span>
                <span className="w-20 text-center">Target</span>
                <span className="w-[5.5rem] text-center">Scoring (pts/unit)</span>
                <span className="w-9" />
              </div>
              {metrics.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="e.g. clients contacted"
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
                    placeholder="0"
                    value={m.value}
                    onChange={(e) => {
                      const copy = [...metrics];
                      copy[i] = { ...copy[i], value: e.target.value };
                      setMetrics(copy);
                    }}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder="1"
                    value={m.points}
                    onChange={(e) => {
                      const copy = [...metrics];
                      copy[i] = { ...copy[i], points: e.target.value };
                      setMetrics(copy);
                    }}
                    className="w-[5.5rem]"
                  />
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
              onClick={() => setMetrics([...metrics, { name: "", value: "", points: "1" }])}
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
              <div className="mt-3 space-y-1">
                {salespeople.map((sp) => (
                  <div key={sp.id} className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-md">
                    {editingId === sp.id ? (
                      <>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(sp.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="h-7 text-sm flex-1"
                          autoFocus
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit(sp.id)}>
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm flex-1 truncate">{sp.name}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(sp.id, sp.name)}>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPersonToDelete({ id: sp.id, name: sp.name })}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button onClick={saveAll} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>

      <AlertDialog open={!!personToDelete} onOpenChange={(o) => !o && setPersonToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {personToDelete?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les activités enregistrées et les objectifs individuels associés à cette personne seront également supprimés définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => personToDelete && removePerson(personToDelete.id, personToDelete.name)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
