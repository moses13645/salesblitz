import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

interface JoinTeamProps {
  buId: string;
}

export function JoinTeam({ buId }: JoinTeamProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const handleJoin = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("salespeople").insert({ bu_id: buId, name: name.trim() });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Welcome, ${name.trim()}! 🎉` });
      setName("");
      qc.invalidateQueries({ queryKey: ["salespeople", buId] });
    }
  };

  return (
    <div className="rounded-lg bg-card border border-border shadow-sm p-5">
      <h3 className="font-display font-semibold text-foreground mb-2">Join the team</h3>
      <p className="text-sm text-muted-foreground mb-3">Add your name so you can start logging activity.</p>
      <div className="flex gap-2">
        <Input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />
        <Button onClick={handleJoin} disabled={loading || !name.trim()}>
          <UserPlus className="h-4 w-4 mr-2" /> Join
        </Button>
      </div>
    </div>
  );
}
