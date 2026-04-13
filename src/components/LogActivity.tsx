import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { METRICS } from "@/lib/metrics";
import { toast } from "@/hooks/use-toast";
import { Plus, Minus } from "lucide-react";

interface LogActivityProps {
  buId: string;
  salespeople: { id: string; name: string }[];
}

export function LogActivity({ buId, salespeople }: LogActivityProps) {
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<string>("calls");
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const handleSubmit = async () => {
    if (!selectedPerson) {
      toast({ title: "Select a salesperson", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("activity_logs").insert({
      bu_id: buId,
      salesperson_id: selectedPerson,
      metric: selectedMetric,
      count,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error logging activity", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Logged ${count} ${selectedMetric}!` });
      setCount(1);
      qc.invalidateQueries({ queryKey: ["activity_logs", buId] });
    }
  };

  return (
    <div className="rounded-lg bg-card border border-border shadow-sm p-5">
      <h3 className="font-display font-semibold text-foreground mb-4">Log Activity</h3>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Salesperson</label>
          <Select value={selectedPerson} onValueChange={setSelectedPerson}>
            <SelectTrigger><SelectValue placeholder="Who?" /></SelectTrigger>
            <SelectContent>
              {salespeople.map((sp) => (
                <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[130px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Metric</label>
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {METRICS.map((m) => (
                <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[120px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Count</label>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" onClick={() => setCount(Math.max(1, count - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-10 text-center font-display font-bold text-lg">{count}</span>
            <Button size="icon" variant="outline" onClick={() => setCount(count + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={loading} className="min-w-[100px]">
          {loading ? "..." : "Log it!"}
        </Button>
      </div>
    </div>
  );
}
