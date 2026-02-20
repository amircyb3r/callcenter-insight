import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIssueTypes() {
  return useQuery({
    queryKey: ["issue-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("issue_types").select("name").order("name");
      if (error) throw error;
      return data.map(d => d.name);
    },
    staleTime: Infinity,
  });
}
