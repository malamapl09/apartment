"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseRealtimeNotificationsParams {
  userId: string | undefined | null;
  onNewNotification: () => void;
}

export function useRealtimeNotifications({
  userId,
  onNewNotification,
}: UseRealtimeNotificationsParams) {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          onNewNotification();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onNewNotification]);
}
