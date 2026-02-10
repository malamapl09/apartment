import { createClient } from "@/lib/supabase/server";

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  const supabase = await createClient();

  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body || null,
    data: params.data || null,
  });

  if (error) {
    console.error("Failed to create notification:", error);
  }

  return { error: error?.message };
}
