"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, PackageCheck } from "lucide-react";
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
import { markPickedUp } from "@/lib/actions/admin-packages";
import type { PackageWithDetails, PackageStatus } from "@/types";

interface PackageTableProps {
  packages: PackageWithDetails[];
}

function StatusBadge({ status }: { status: PackageStatus }) {
  const t = useTranslations("admin.packages.status");

  const variantMap: Record<
    PackageStatus,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    pending: "default",
    notified: "secondary",
    picked_up: "outline",
  };

  const classMap: Record<PackageStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    notified: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    picked_up: "bg-green-100 text-green-800 hover:bg-green-100",
  };

  return (
    <Badge variant={variantMap[status]} className={classMap[status]}>
      {t(status)}
    </Badge>
  );
}

export function PackageTable({ packages }: PackageTableProps) {
  const t = useTranslations("admin.packages");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  const handleMarkPickedUp = (id: string) => {
    setActionId(id);
    startTransition(async () => {
      const result = await markPickedUp(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("pickupSuccess"));
        router.refresh();
      }
      setActionId(null);
    });
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (packages.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.apartment")}</TableHead>
              <TableHead>{t("table.description")}</TableHead>
              <TableHead>{t("table.carrier")}</TableHead>
              <TableHead>{t("table.tracking")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead>{t("table.received")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={7}
                className="py-8 text-center text-muted-foreground"
              >
                {t("noPackages")}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.apartment")}</TableHead>
            <TableHead>{t("table.description")}</TableHead>
            <TableHead>{t("table.carrier")}</TableHead>
            <TableHead>{t("table.tracking")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
            <TableHead>{t("table.received")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {packages.map((pkg) => {
            const isActing = isPending && actionId === pkg.id;
            return (
              <TableRow key={pkg.id}>
                <TableCell className="font-medium">
                  {pkg.apartments?.unit_number ?? "\u2014"}
                </TableCell>
                <TableCell>{pkg.description}</TableCell>
                <TableCell>{pkg.carrier ?? "\u2014"}</TableCell>
                <TableCell>
                  {pkg.tracking_number ? (
                    <span className="font-mono text-sm">
                      {pkg.tracking_number}
                    </span>
                  ) : (
                    "\u2014"
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={pkg.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(pkg.received_at)}
                </TableCell>
                <TableCell className="text-right">
                  {(pkg.status === "pending" || pkg.status === "notified") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkPickedUp(pkg.id)}
                      disabled={isPending}
                      aria-label={t("markPickedUp")}
                    >
                      {isActing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PackageCheck className="h-4 w-4" />
                      )}
                      <span className="ml-1 hidden sm:inline">
                        {t("markPickedUp")}
                      </span>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
