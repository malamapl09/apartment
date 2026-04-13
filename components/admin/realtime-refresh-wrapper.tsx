"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useUser } from "@/lib/hooks/use-user";
import { useRealtimeMaintenance } from "@/lib/hooks/use-realtime-maintenance";
import { useRealtimeVisitors } from "@/lib/hooks/use-realtime-visitors";
import { useRealtimePayments } from "@/lib/hooks/use-realtime-payments";

interface RealtimeRefreshWrapperProps {
  children: React.ReactNode;
  watchMaintenance?: boolean;
  watchVisitors?: boolean;
  watchPayments?: boolean;
}

export function RealtimeRefreshWrapper({
  children,
  watchMaintenance = false,
  watchVisitors = false,
  watchPayments = false,
}: RealtimeRefreshWrapperProps) {
  const router = useRouter();
  const { profile } = useUser();
  // common.json's top-level keys are not namespaced under "common" — the
  // actual path for this string is realtime.dataUpdated.
  const t = useTranslations("realtime");
  const buildingId = profile?.building_id;

  const handleUpdate = useCallback(() => {
    router.refresh();
    toast.info(t("dataUpdated"));
  }, [router, t]);

  useRealtimeMaintenance({
    buildingId: watchMaintenance ? buildingId : null,
    onUpdate: handleUpdate,
  });

  useRealtimeVisitors({
    buildingId: watchVisitors ? buildingId : null,
    onUpdate: handleUpdate,
  });

  useRealtimePayments({
    buildingId: watchPayments ? buildingId : null,
    onUpdate: handleUpdate,
  });

  return <>{children}</>;
}
