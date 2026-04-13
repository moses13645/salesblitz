import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBU(slug: string) {
  return useQuery({
    queryKey: ["bu", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_units")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

export function useSalespeople(buId: string | undefined) {
  return useQuery({
    queryKey: ["salespeople", buId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salespeople")
        .select("*")
        .eq("bu_id", buId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!buId,
    refetchInterval: 5000,
  });
}

export function useTargets(buId: string | undefined) {
  return useQuery({
    queryKey: ["targets", buId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("targets")
        .select("*")
        .eq("bu_id", buId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!buId,
    refetchInterval: 5000,
  });
}

export function useActivityLogs(buId: string | undefined) {
  return useQuery({
    queryKey: ["activity_logs", buId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("bu_id", buId!)
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!buId,
    refetchInterval: 5000,
  });
}
