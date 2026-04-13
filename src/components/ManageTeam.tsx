import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { METRICS } from "@/lib/metrics";
import { UserPlus, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ManageTeamProps {
  buId: string;
  salespeople: { id: string; name: string }[];
  targets: { id: string; bu_id: string; salesperson_id: string | null; metric: string; target_value: number }[];
}

export function ManageTeam({ buId, salespeople, targets }: ManageTeamProps) {
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [teamTargets, setTeamTargets] = useState<Record<string, string>>({});
  const qc = useQueryClient();

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

  const saveTargets = async () => {
    const upserts = METRICS.map((m) => {
      const val = parseInt(teamTargets[m.key] || "0", 10);
      return {
        bu_id: buId,
        salesperson_id: null as string | null,
        metric: m.key,
        target_value: val,
      };
    }).filter((t) => t.target_value > 0);

    if (upserts.length === 0) return;

    for (const u of upserts) {
      const existing = targets.find((t) => !t.salesperson_id && t.metric === u.metric);
      if (existing) {
        await supabase.from("targets").update({ target_value: u.target_value }).eq("id", existing.id);
      } else {
        await supabase.from("targets").insert(u);
      }
    }
    qc.invalidateQueries({ queryKey: ["targets", buId] });
    toast({ title: "Team targets updated!" });
  };

  const currentTeamTargets = METRICS.reduce<Record<string, string>>((acc, m) => {
    const t = targets.find((t) => !t.salesperson_id && t.metric === m.key);
    acc[m.key] = teamTargets[m.key] ?? (t ? String(t.target_value) : "");
    return acc;
  }, {});

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" /> Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Team Setup</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
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
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Team Targets</h4>
            <div className="grid gap-2">
              {METRICS.map((m) => (
                <div key={m.key} className="flex items-center gap-2">
                  <label className="text-sm w-20">{m.label}</label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={currentTeamTargets[m.key]}
                    onChange={(e) => setTeamTargets((p) => ({ ...p, [m.key]: e.target.value }))}
                    className="w-24"
                  />
                </div>
              ))}
            </div>
            <Button onClick={saveTargets} size="sm" className="mt-3">
              Save Targets
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
