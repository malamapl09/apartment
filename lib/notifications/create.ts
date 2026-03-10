import { createAdminClient } from "@/lib/supabase/admin";

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

/**
 * Create an in-app notification for a user.
 * Uses the admin (service-role) client because the INSERT RLS policy
 * on notifications was dropped — inserts must bypass RLS.
 */
export async function createNotification(params: CreateNotificationParams) {
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("notifications").insert({
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

/**
 * Create notifications for multiple users (fire-and-forget).
 * Useful for announcements and broadcast events.
 */
export async function createBulkNotifications(
  userIds: string[],
  notification: Omit<CreateNotificationParams, "userId">
) {
  if (userIds.length === 0) return;

  const adminClient = createAdminClient();

  const rows = userIds.map((userId) => ({
    user_id: userId,
    type: notification.type,
    title: notification.title,
    body: notification.body || null,
    data: notification.data || null,
  }));

  const { error } = await adminClient.from("notifications").insert(rows);

  if (error) {
    console.error("Failed to create bulk notifications:", error);
  }
}
