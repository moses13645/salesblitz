import { useState, useEffect } from "react";
import { Timer, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface SessionTimerProps {
  buId: string;
  durationMinutes: number | null;
  startedAt: string | null;
}

export function SessionTimer({ buId, durationMinutes, startedAt }: SessionTimerProps) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const qc = useQueryClient();

  const isRunning = !!startedAt && !!durationMinutes;

  useEffect(() => {
    if (!isRunning) {
      setRemaining(durationMinutes ? durationMinutes * 60 : null);
      return;
    }

    const calc = () => {
      const end = new Date(startedAt).getTime() + durationMinutes * 60 * 1000;
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemaining(diff);
    };

    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [startedAt, durationMinutes, isRunning]);

  const startTimer = async () => {
    await supabase
      .from("business_units")
      .update({ session_started_at: new Date().toISOString() })
      .eq("id", buId);
    qc.invalidateQueries({ queryKey: ["bu"] });
  };

  const stopTimer = async () => {
    await supabase
      .from("business_units")
      .update({ session_started_at: null })
      .eq("id", buId);
    qc.invalidateQueries({ queryKey: ["bu"] });
  };

  if (!durationMinutes) return null;

  const mins = Math.floor((remaining ?? 0) / 60);
  const secs = (remaining ?? 0) % 60;
  const isExpired = remaining === 0 && isRunning;
  const pct = isRunning && durationMinutes
    ? Math.max(0, (remaining ?? 0) / (durationMinutes * 60)) * 100
    : 100;

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-mono transition-colors ${
      isExpired
        ? "border-destructive/50 bg-destructive/10 text-destructive animate-pulse"
        : isRunning
          ? "border-primary/30 bg-primary/5 text-foreground"
          : "border-border bg-muted text-muted-foreground"
    }`}>
      <Timer className="h-4 w-4 shrink-0" />
      <div className="flex items-center gap-1.5">
        <span className="tabular-nums min-w-[3.5rem] text-center">
          {isExpired ? "00:00" : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
        </span>
        {/* Mini progress bar */}
        <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${isExpired ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {!isRunning ? (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startTimer}>
          <Play className="h-3 w-3" />
        </Button>
      ) : (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={stopTimer}>
          <Square className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
