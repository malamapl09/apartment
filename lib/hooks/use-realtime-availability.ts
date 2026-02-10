"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Reservation } from "@/types";

export function useRealtimeAvailability(spaceId: string) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    const fetchReservations = async () => {
      const { data } = await supabase
        .from("reservations")
        .select("*")
        .eq("space_id", spaceId)
        .in("status", ["pending_payment", "payment_submitted", "confirmed"])
        .gte("start_time", new Date().toISOString())
        .order("start_time");

      if (data) setReservations(data);
    };

    fetchReservations();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`reservations:${spaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
          filter: `space_id=eq.${spaceId}`,
        },
        () => {
          fetchReservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId, supabase]);

  return { reservations };
}
