"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseRealtimePaymentsParams {
  buildingId: string | undefined | null;
  onUpdate: () => void;
}

export function useRealtimePayments({
  buildingId,
  onUpdate,
}: UseRealtimePaymentsParams) {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!buildingId) return;

    const channel = supabase
      .channel(`payments-${buildingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `building_id=eq.${buildingId}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [buildingId, onUpdate]);
}
