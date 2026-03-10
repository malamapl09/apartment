"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateMaintenanceStatus } from "@/lib/actions/admin-maintenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import type { MaintenanceStatus } from "@/types";

const statusOptions: MaintenanceStatus[] = [
  "open",
  "in_progress",
  "waiting_parts",
  "resolved",
  "closed",
];

interface MaintenanceStatusUpdateProps {
  requestId: string;
  currentStatus: MaintenanceStatus;
  currentAssignedTo: string | null;
}

export function MaintenanceStatusUpdate({
  requestId,
  currentStatus,
  currentAssignedTo,
}: MaintenanceStatusUpdateProps) {
  const t = useTranslations("admin.maintenance");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<MaintenanceStatus>(currentStatus);
  const [assignedTo, setAssignedTo] = useState(currentAssignedTo ?? "");

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateMaintenanceStatus(requestId, status, assignedTo);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("statusUpdated"));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="status">{t("updateStatus")}</Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as MaintenanceStatus)}
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assigned_to">{t("assignTo")}</Label>
        <Input
          id="assigned_to"
          placeholder={t("assignPlaceholder")}
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
        />
      </div>

      <Button onClick={handleSave} disabled={isPending} className="w-full">
        {isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        {t("assign")}
      </Button>
    </div>
  );
}
