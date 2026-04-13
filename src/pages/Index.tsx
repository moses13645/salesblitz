import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Index() {
  const [joinSlug, setJoinSlug] = useState("");
  const navigate = useNavigate();

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

        <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
          <h2 className="font-display font-semibold text-foreground text-sm">Join your team</h2>
          <Input
            placeholder="Enter BU slug (e.g. west-coast)"
            value={joinSlug}
            onChange={(e) => setJoinSlug(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinBU()}
          />
          <Button onClick={joinBU} className="w-full">
            Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
