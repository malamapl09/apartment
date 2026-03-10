"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseRealtimeMaintenanceParams {
  buildingId: string | undefined | null;
  onUpdate: () => void;
}

export function useRealtimeMaintenance({
  buildingId,
  onUpdate,
}: UseRealtimeMaintenanceParams) {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!buildingId) return;

    const channel = supabase
      .channel(`maintenance-${buildingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "maintenance_requests",
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
