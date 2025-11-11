// src/lib/activity.ts
import { supabase } from "@/integrations/supabase/client";

type LogInput = {
  entity_type: "resume" | "job" | "pipeline" | string;
  entity_id?: string | null;
  action: string;
  details?: Record<string, any>;
};

export async function logActivity(input: LogInput) {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return;

  await supabase.from("activity_log").insert({
    user_id: u.user.id,
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? null,
    action: input.action,
    details: input.details ?? {},
  });
}
