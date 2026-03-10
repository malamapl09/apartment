"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { MaintenancePriority, MaintenanceStatus } from "@/types";

interface MaintenanceRequest {
  id: string;
  reference_code: string;
  title: string;
  category: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assigned_to: string | null;
  created_at: string;
  profiles: { id: string; full_name: string; email: string } | null;
  apartments: { id: string; unit_number: string } | null;
}

interface MaintenanceTableProps {
  requests: MaintenanceRequest[];
  locale: string;
}

const priorityConfig: Record<
  MaintenancePriority,
  { className: string; variant: "secondary" | "default" | "destructive" | "outline" }
> = {
  low: {
    variant: "secondary",
    className: "",
  },
  medium: {
    variant: "default",
    className: "",
  },
  high: {
    variant: "secondary",
    className:
      "bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20 border-orange-200",
  },
  urgent: {
    variant: "destructive",
    className: "",
  },
};

const statusConfig: Record<
  MaintenanceStatus,
  { className: string }
> = {
  open: {
    className:
      "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20",
  },
  in_progress: {
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20",
  },
  waiting_parts: {
    className:
      "bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20",
  },
  resolved: {
    className:
      "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20",
  },
  closed: {
    className:
      "bg-gray-500/10 text-gray-700 dark:text-gray-400 hover:bg-gray-500/20",
  },
};

export function MaintenanceTable({ requests, locale }: MaintenanceTableProps) {
  const t = useTranslations("admin.maintenance");

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("table.empty")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.reference")}</TableHead>
            <TableHead>{t("table.title")}</TableHead>
            <TableHead>{t("table.apartment")}</TableHead>
            <TableHead>{t("table.category")}</TableHead>
            <TableHead>{t("table.priority")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
            <TableHead>{t("table.assignedTo")}</TableHead>
            <TableHead>{t("table.date")}</TableHead>
            <TableHead className="w-[70px]">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const pCfg = priorityConfig[request.priority];
            const sCfg = statusConfig[request.status];
            return (
              <TableRow key={request.id}>
                <TableCell className="font-mono text-sm">
                  {request.reference_code}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium max-w-[200px] truncate">
                      {request.title}
                    </p>
                    {request.profiles && (
                      <p className="text-xs text-muted-foreground">
                        {request.profiles.full_name}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {request.apartments ? (
                    <span className="text-sm font-medium">
                      {request.apartments.unit_number}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm capitalize">
                    {t(`category.${request.category}`)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={pCfg.variant}
                    className={cn("capitalize", pCfg.className)}
                  >
                    {t(`priority.${request.priority}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(sCfg.className)}
                  >
                    {t(`status.${request.status}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {request.assigned_to ? (
                    <span className="text-sm">{request.assigned_to}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t("unassigned")}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(request.created_at), "PP")}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t("table.actions")}</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/${locale}/admin/maintenance/${request.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t("table.viewDetails")}
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
