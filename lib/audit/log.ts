import { createClient } from "@/lib/supabase/server";

export async function logAuditEvent(params: {
  action: string;
  tableName: string;
  recordId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles").select("building_id").eq("id", user.id).single();

  await supabase.from("audit_logs").insert({
    building_id: profile?.building_id || null,
    user_id: user.id,
    action: params.action,
    table_name: params.tableName,
    record_id: params.recordId || null,
    old_data: params.oldData || null,
    new_data: params.newData || null,
  });
}
