import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Feedback {
  id: string;
  phase_id: string;
  issue_type: string;
  city: string | null;
  center_name: string | null;
  customer_id: string | null;
  customer_ip: string | null;
  sim_card_number: string | null;
  connected_operator: string | null;
  area: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  is_mobile_issue: boolean;
}

export interface FeedbackFilters {
  phaseId?: string;
  dateFrom?: string;
  dateTo?: string;
  issueTypes?: string[];
  city?: string;
  centerName?: string;
  createdBy?: string;
  search?: string;
}

export function useFeedbacks(filters: FeedbackFilters) {
  return useQuery({
    queryKey: ["feedbacks", filters],
    queryFn: async () => {
      let query = supabase.from("feedbacks").select("*").order("created_at", { ascending: false });

      if (filters.phaseId) query = query.eq("phase_id", filters.phaseId);
      if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
      if (filters.dateTo) query = query.lte("created_at", filters.dateTo);
      if (filters.issueTypes?.length) query = query.in("issue_type", filters.issueTypes);
      if (filters.city) query = query.eq("city", filters.city);
      if (filters.centerName) query = query.ilike("center_name", `%${filters.centerName}%`);
      if (filters.createdBy) query = query.eq("created_by", filters.createdBy);
      if (filters.search) {
        query = query.or(
          `customer_id.ilike.%${filters.search}%,customer_ip.ilike.%${filters.search}%,sim_card_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as Feedback[];
    },
  });
}

export function useFeedbackRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("feedbacks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedbacks" }, () => {
        qc.invalidateQueries({ queryKey: ["feedbacks"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}
