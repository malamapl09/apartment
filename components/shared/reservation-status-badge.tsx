"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Upload,
  Calendar,
} from "lucide-react";
import type { ReservationStatus } from "@/types";

interface ReservationStatusBadgeProps {
  status: ReservationStatus | string;
  className?: string;
}

export function ReservationStatusBadge({ status, className }: ReservationStatusBadgeProps) {
  const t = useTranslations("reservations.status");

  const statusConfig = {
    pending_payment: {
      label: t("pending_payment"),
      variant: "secondary" as const,
      icon: Clock,
      className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20",
    },
    payment_submitted: {
      label: t("payment_submitted"),
      variant: "secondary" as const,
      icon: Upload,
      className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20",
    },
    confirmed: {
      label: t("confirmed"),
      variant: "default" as const,
      icon: CheckCircle2,
      className: "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20",
    },
    cancelled: {
      label: t("cancelled"),
      variant: "destructive" as const,
      icon: XCircle,
      className: "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20",
    },
    completed: {
      label: t("completed"),
      variant: "outline" as const,
      icon: Calendar,
      className: "bg-gray-500/10 text-gray-700 dark:text-gray-400 hover:bg-gray-500/20",
    },
    rejected: {
      label: t("rejected"),
      variant: "destructive" as const,
      icon: XCircle,
      className: "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    variant: "secondary" as const,
    icon: AlertCircle,
    className: "",
  };

  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn("gap-1 font-medium", config.className, className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// Keep default export for backward compatibility
export default ReservationStatusBadge;
