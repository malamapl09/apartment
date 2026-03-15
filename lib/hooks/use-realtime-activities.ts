"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SpaceActivity } from "@/types";

export function useRealtimeActivities(spaceId: string) {
  const [activities, setActivities] = useState<SpaceActivity[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchActivities = async () => {
      const { data } = await supabase
        .from("space_activities")
        .select("*")
        .eq("space_id", spaceId)
        .eq("status", "active")
        .gte("end_time", new Date().toISOString())
        .order("start_time");

      if (data) setActivities(data);
    };

    fetchActivities();

    const channel = supabase
      .channel(`space_activities:${spaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "space_activities",
          filter: `space_id=eq.${spaceId}`,
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId, supabase]);

  return { activities };
}
