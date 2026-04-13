import { useParams, Link } from "react-router-dom";
import { useBU, useSalespeople, useTargets, useActivityLogs } from "@/hooks/useBUData";
import { TeamProgress } from "@/components/TeamProgress";
import { Leaderboard } from "@/components/Leaderboard";
import { LogActivity } from "@/components/LogActivity";
import { ManageTeam } from "@/components/ManageTeam";
import { ActivityFeed } from "@/components/ActivityFeed";
import { ArrowLeft, Zap, Target, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportBUToExcel } from "@/lib/exportBU";

export default function BUDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const { data: bu, isLoading } = useBU(slug || "");
  const { data: salespeople = [] } = useSalespeople(bu?.id);
  const { data: targets = [] } = useTargets(bu?.id);
  const { data: activityLogs = [] } = useActivityLogs(bu?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse font-display text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!bu) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Business Unit not found.</p>
        <Link to="/" className="text-primary underline">Go back</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              <h1 className="font-display font-bold text-xl text-foreground">{bu.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportBUToExcel(bu.name, salespeople, targets, activityLogs)}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <ManageTeam buId={bu.id} sessionObjective={bu.session_objective ?? null} salespeople={salespeople} targets={targets} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {bu.session_objective && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-start gap-3">
            <Target className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-primary mb-1">Session Objective</p>
              <p className="text-sm text-foreground">{bu.session_objective}</p>
            </div>
          </div>
        )}
        <TeamProgress targets={targets} activityLogs={activityLogs} />
        
        <LogActivity buId={bu.id} salespeople={salespeople} targets={targets} activityLogs={activityLogs} />
        <Leaderboard salespeople={salespeople} activityLogs={activityLogs} targets={targets} />
        <ActivityFeed activityLogs={activityLogs} salespeople={salespeople} />
      </main>
    </div>
  );
}
