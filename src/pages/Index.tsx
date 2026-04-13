import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Zap, ArrowRight } from "lucide-react";

export default function Index() {
  const [buName, setBuName] = useState("");
  const [joinSlug, setJoinSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createBU = async () => {
    if (!buName.trim()) return;
    const slug = buName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setLoading(true);
    const { error } = await supabase.from("business_units").insert({ name: buName.trim(), slug });
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "That name is taken", description: "Try a different name.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      navigate(`/bu/${slug}`);
    }
  };

  const joinBU = () => {
    if (!joinSlug.trim()) return;
    navigate(`/bu/${joinSlug.trim().toLowerCase()}`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 shadow-sm">
            <Zap className="h-5 w-5 text-warning" />
            <span className="font-display font-bold text-foreground">Sales Blitz</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mt-4">
            Hit your targets.<br />Together.
          </h1>
          <p className="text-muted-foreground text-sm">
            Track calls, meetings, and deals in real-time with your team.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
            <h2 className="font-display font-semibold text-foreground text-sm">Create a new blitz</h2>
            <Input
              placeholder="Business Unit name"
              value={buName}
              onChange={(e) => setBuName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createBU()}
            />
            <Button onClick={createBU} disabled={loading} className="w-full">
              Create Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">or join existing</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
            <h2 className="font-display font-semibold text-foreground text-sm">Join your team</h2>
            <Input
              placeholder="Enter BU slug (e.g. west-coast)"
              value={joinSlug}
              onChange={(e) => setJoinSlug(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinBU()}
            />
            <Button onClick={joinBU} variant="outline" className="w-full">
              Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
