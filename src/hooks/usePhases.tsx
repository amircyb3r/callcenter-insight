import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Phase {
  id: string;
  title: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  created_by: string;
}

export function usePhases() {
  return useQuery({
    queryKey: ["phases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Phase[];
    },
  });
}

export function useActivePhase() {
  return useQuery({
    queryKey: ["active-phase"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phases")
        .select("*")
        .eq("status", "OPEN")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Phase | null;
    },
  });
}

export function useCreatePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("phases").insert({ title, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phases"] });
      qc.invalidateQueries({ queryKey: ["active-phase"] });
    },
  });
}

export function useClosePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (phaseId: string) => {
      const { error } = await supabase
        .from("phases")
        .update({ status: "CLOSED", closed_at: new Date().toISOString() })
        .eq("id", phaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phases"] });
      qc.invalidateQueries({ queryKey: ["active-phase"] });
    },
  });
}
