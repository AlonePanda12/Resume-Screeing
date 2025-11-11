import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchShortlistedCount() {
  const { count, error } = await supabase
    .from("resumes")
    .select("id", { count: "exact", head: true })
    .eq("stage", "shortlisted");
  if (error) throw error;
  return count ?? 0;
}

export function useShortlistedCount() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("resumes-shortlisted-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resumes" },
        () => qc.invalidateQueries({ queryKey: ["shortlisted-count"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["shortlisted-count"],
    queryFn: fetchShortlistedCount,
    staleTime: 15_000,
  });
}
