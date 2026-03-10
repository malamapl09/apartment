"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseRealtimeVisitorsParams {
  buildingId: string | undefined | null;
  onUpdate: () => void;
}

export function useRealtimeVisitors({
  buildingId,
  onUpdate,
}: UseRealtimeVisitorsParams) {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!buildingId) return;

    const channel = supabase
      .channel(`visitors-${buildingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitors",
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
