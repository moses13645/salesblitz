import { useState, useEffect, useMemo, useRef } from "react";
import { Timer, Play, Square, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export interface SessionPhase {
  name: string;
  durationMinutes: number;
}

interface SessionTimerProps {
  buId: string;
  phases: SessionPhase[] | null;
  currentPhaseIndex: number;
  startedAt: string | null;
  // Legacy single-timer fallback
  durationMinutes: number | null;
}

export function SessionTimer({ buId, phases, currentPhaseIndex, startedAt, durationMinutes }: SessionTimerProps) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const qc = useQueryClient();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playedStartRef = useRef<string | null>(null);
  const playedEndRef = useRef<string | null>(null);

  const getAudioCtx = () => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AC) return null;
      audioCtxRef.current = new AC();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  // Synthesized church-bell strike: inharmonic partials with long shimmering decay
  const playBellStrike = (startAt: number, baseFreq = 440, velocity = 1) => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const master = ctx.createGain();
    const decay = 4.5;
    master.gain.setValueAtTime(0.0001, startAt);
    master.gain.exponentialRampToValueAtTime(0.9 * velocity, startAt + 0.005);
    master.gain.exponentialRampToValueAtTime(0.0001, startAt + decay);
    master.connect(ctx.destination);

    // Classic inharmonic bell ratios (hum, prime, tierce, quint, nominal, upper)
    const partials = [
      { ratio: 0.5, g: 0.7, decay: decay },
      { ratio: 1.0, g: 1.0, decay: decay * 0.9 },
      { ratio: 1.2, g: 0.55, decay: decay * 0.75 },
      { ratio: 1.5, g: 0.45, decay: decay * 0.6 },
      { ratio: 2.0, g: 0.5, decay: decay * 0.5 },
      { ratio: 2.5, g: 0.3, decay: decay * 0.4 },
      { ratio: 3.0, g: 0.22, decay: decay * 0.3 },
      { ratio: 4.2, g: 0.15, decay: decay * 0.25 },
      { ratio: 5.4, g: 0.1, decay: decay * 0.2 },
    ];
    partials.forEach(({ ratio, g, decay: d }) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq * ratio, startAt);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(g, startAt + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + d);
      osc.connect(gain).connect(master);
      osc.start(startAt);
      osc.stop(startAt + d + 0.05);
    });
  };

  // Joyful peal of bells: alternating pitches over several seconds
  const playGong = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Alternating bell pitches (like a small carillon), ~8s total
    const pattern: Array<{ t: number; f: number; v: number }> = [
      { t: 0.0, f: 523, v: 1.0 },  // C5
      { t: 0.45, f: 659, v: 0.95 }, // E5
      { t: 0.9, f: 784, v: 1.0 },  // G5
      { t: 1.35, f: 659, v: 0.9 },  // E5
      { t: 1.8, f: 523, v: 0.95 }, // C5
      { t: 2.25, f: 784, v: 1.0 }, // G5
      { t: 2.7, f: 1047, v: 1.0 }, // C6
      { t: 3.3, f: 784, v: 0.9 },  // G5
      { t: 3.9, f: 523, v: 1.0 },  // C5 final
    ];
    pattern.forEach(({ t, f, v }) => playBellStrike(now + t, f, v));
  };

  // Determine active phase
  const activePhases = useMemo(() => {
    if (phases && phases.length > 0) return phases;
    if (durationMinutes) return [{ name: "Session", durationMinutes }];
    return null;
  }, [phases, durationMinutes]);

  const currentPhase = activePhases ? activePhases[Math.min(currentPhaseIndex, activePhases.length - 1)] : null;
  const isRunning = !!startedAt && !!currentPhase;
  const isLastPhase = activePhases ? currentPhaseIndex >= activePhases.length - 1 : true;

  useEffect(() => {
    if (!currentPhase) {
      setRemaining(null);
      return;
    }
    if (!isRunning) {
      setRemaining(currentPhase.durationMinutes * 60);
      return;
    }

    const calc = () => {
      const end = new Date(startedAt!).getTime() + currentPhase.durationMinutes * 60 * 1000;
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemaining(diff);
    };

    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [startedAt, currentPhase, isRunning]);

  const startTimer = async () => {
    // Prime audio context inside the user gesture so subsequent gongs can play
    getAudioCtx();
    playGong();
    await supabase
      .from("business_units")
      .update({
        session_started_at: new Date().toISOString(),
        current_phase_index: currentPhaseIndex,
      } as any)
      .eq("id", buId);
    qc.invalidateQueries({ queryKey: ["bu"] });
  };

  const stopTimer = async () => {
    await supabase
      .from("business_units")
      .update({ session_started_at: null } as any)
      .eq("id", buId);
    qc.invalidateQueries({ queryKey: ["bu"] });
  };

  const nextPhase = async () => {
    if (!activePhases || isLastPhase) return;
    const next = currentPhaseIndex + 1;
    getAudioCtx();
    playGong();
    await supabase
      .from("business_units")
      .update({
        current_phase_index: next,
        session_started_at: new Date().toISOString(),
      } as any)
      .eq("id", buId);
    qc.invalidateQueries({ queryKey: ["bu"] });
  };

  const resetTimer = async () => {
    await supabase
      .from("business_units")
      .update({
        session_started_at: null,
        current_phase_index: 0,
      } as any)
      .eq("id", buId);
    qc.invalidateQueries({ queryKey: ["bu"] });
  };

  // Identifier unique pour cette phase active + détection de fin (hooks déclarés AVANT tout return)
  const phaseKey = startedAt ? `${startedAt}:${currentPhaseIndex}` : null;
  const endReached =
    !!currentPhase && !!startedAt && remaining === 0;

  useEffect(() => {
    if (endReached && phaseKey && playedEndRef.current !== phaseKey) {
      playedEndRef.current = phaseKey;
      playGong();
    }
  }, [endReached, phaseKey]);

  if (!activePhases || activePhases.length === 0) return null;

  const mins = Math.floor((remaining ?? 0) / 60);
  const secs = (remaining ?? 0) % 60;
  const isExpired = remaining === 0 && isRunning;
  const phaseDuration = currentPhase ? currentPhase.durationMinutes * 60 : 1;
  const pct = isRunning ? Math.max(0, (remaining ?? 0) / phaseDuration) * 100 : 100;

  // Affiche le décompte plein écran sur les 10 dernières secondes
  const showCountdown = isRunning && remaining !== null && remaining > 0 && remaining <= 10;

  return (
    <>
      {showCountdown && (
        <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
          <p className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground mb-4">
            {currentPhase?.name} ends in
          </p>
          <div
            key={remaining}
            className="font-display font-bold text-[14rem] leading-none text-primary animate-scale-in tabular-nums"
            style={{ textShadow: "0 0 80px hsl(var(--primary) / 0.4)" }}
          >
            {remaining}
          </div>
        </div>
      )}
    <div className="flex items-center gap-2">
      {/* Phase indicator pills */}
      {activePhases.length > 1 && (
        <div className="hidden sm:flex items-center gap-1">
          {activePhases.map((p, i) => (
            <Badge
              key={i}
              variant={i === currentPhaseIndex ? "default" : i < currentPhaseIndex && isRunning ? "secondary" : "outline"}
              className={`text-[10px] px-1.5 py-0 h-5 ${
                i === currentPhaseIndex ? "" : "opacity-60"
              }`}
            >
              {p.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Timer display */}
      <div
        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-mono transition-colors ${
          isExpired
            ? "border-destructive/50 bg-destructive/10 text-destructive animate-pulse"
            : isRunning
              ? "border-primary/30 bg-primary/5 text-foreground"
              : "border-border bg-muted text-muted-foreground"
        }`}
      >
        <Timer className="h-4 w-4 shrink-0" />
        <div className="flex items-center gap-1.5">
          {activePhases.length > 1 && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {currentPhase?.name}
            </span>
          )}
          <span className="tabular-nums min-w-[3.5rem] text-center">
            {isExpired
              ? "00:00"
              : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
          </span>
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isExpired ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        {!isRunning ? (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startTimer}>
            <Play className="h-3 w-3" />
          </Button>
        ) : (
          <>
            {isExpired && !isLastPhase ? (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={nextPhase} title="Next phase">
                <SkipForward className="h-3 w-3" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={stopTimer}>
                <Square className="h-3 w-3" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}
