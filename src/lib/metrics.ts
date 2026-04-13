import { Phone, Calendar, Handshake, LucideIcon } from "lucide-react";

export type MetricType = "calls" | "meetings" | "deals";

export const METRICS: { key: MetricType; label: string; icon: LucideIcon; color: string }[] = [
  { key: "calls", label: "Calls", icon: Phone, color: "text-info" },
  { key: "meetings", label: "Meetings", icon: Calendar, color: "text-warning" },
  { key: "deals", label: "Deals", icon: Handshake, color: "text-success" },
];
