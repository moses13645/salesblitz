import { useState } from "react";
import { Clock, Pencil, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface ActivityFeedProps {
  buId: string;
  activityLogs: {
    id: string;
    salesperson_id: string;
    metric: string;
    count: number;
    logged_at: string;
    note?: string | null;
    fields_data?: any;
  }[];
  salespeople: { id: string; name: string }[];
}

export function ActivityFeed({ buId, activityLogs, salespeople }: ActivityFeedProps) {
  const spMap = Object.fromEntries(salespeople.map((sp) => [sp.id, sp.name]));
  const qc = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSalesperson, setEditSalesperson] = useState("");
  const [editNote, setEditNote] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (activityLogs.length === 0) {
    return null;
  }

  const startEdit = (log: ActivityFeedProps["activityLogs"][0]) => {
    setEditingId(log.id);
    setEditSalesperson(log.salesperson_id);
    setEditNote(log.note || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (logId: string) => {
    const { error } = await supabase
      .from("activity_logs")
      .update({
        salesperson_id: editSalesperson,
        note: editNote.trim() || null,
      })
      .eq("id", logId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✓ Entry updated" });
      qc.invalidateQueries({ queryKey: ["activity_logs", buId] });
    }
    setEditingId(null);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("activity_logs").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✓ Entry deleted" });
      qc.invalidateQueries({ queryKey: ["activity_logs", buId] });
    }
    setDeleteId(null);
  };

  return (
    <>
      <div className="rounded-lg bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-display font-semibold text-foreground">Activity History</h3>
          <span className="text-xs text-muted-foreground ml-auto">{activityLogs.length} entries</span>
        </div>
        <div className="divide-y divide-border max-h-80 overflow-y-auto">
          {activityLogs.map((log) => {
            const time = new Date(log.logged_at).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const name = spMap[log.salesperson_id] || "Unknown";
            const fd = log.fields_data as Record<string, any> | null;
            const isEditing = editingId === log.id;

            if (isEditing) {
              return (
                <div key={log.id} className="px-4 py-3 flex items-center gap-3 text-sm bg-muted/40">
                  <span className="text-xs text-muted-foreground font-mono shrink-0">{time}</span>
                  <Select value={editSalesperson} onValueChange={setEditSalesperson}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {salespeople.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="font-medium text-foreground text-xs">"{log.metric}"</span>
                  <Input
                    className="h-8 text-xs flex-1"
                    placeholder="Note (optional)"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => saveEdit(log.id)}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={cancelEdit}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            }

            return (
              <div key={log.id} className="group px-4 py-3 flex items-start gap-3 text-sm hover:bg-muted/30 transition-colors">
                <span className="text-xs text-muted-foreground font-mono mt-0.5 shrink-0">{time}</span>
                <div className="flex-1">
                  <span className="font-medium text-foreground">{name}</span>
                  <span className="text-muted-foreground"> added </span>
                  <span className="font-medium text-foreground">"{log.metric}"</span>
                  {fd && Object.keys(fd).length > 0 ? (
                    <span className="text-muted-foreground">
                      {" — "}
                      {Object.entries(fd).map(([k, v], i) => (
                        <span key={k}>
                          {i > 0 && " · "}
                          <span className="text-xs font-medium text-foreground">{k}:</span>{" "}
                          <span className="italic">{String(v)}</span>
                        </span>
                      ))}
                    </span>
                  ) : log.note ? (
                    <>
                      <span className="text-muted-foreground"> — </span>
                      <span className="italic text-muted-foreground">{log.note}</span>
                    </>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEdit(log)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(log.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The activity log entry will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
