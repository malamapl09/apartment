"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, LogIn, LogOut, Eye } from "lucide-react";
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
import { Link } from "@/i18n/navigation";
import { checkInVisitor, checkOutVisitor } from "@/lib/actions/admin-visitors";
import { formatGroupLabel } from "@/lib/visitors/helpers";
import type { VisitorWithDetails, VisitorStatus } from "@/types";

type VisitorRow = VisitorWithDetails & {
  visitor_companions?: { id: string }[] | null;
};

interface VisitorTableProps {
  visitors: VisitorRow[];
}

function StatusBadge({ status }: { status: VisitorStatus }) {
  const t = useTranslations("admin.visitors.status");

  const variantMap: Record<
    VisitorStatus,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    expected: "default",
    checked_in: "secondary",
    checked_out: "outline",
    expired: "outline",
    cancelled: "destructive",
  };

  const classMap: Record<VisitorStatus, string> = {
    expected: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    checked_in: "bg-green-100 text-green-800 hover:bg-green-100",
    checked_out: "",
    expired: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    cancelled: "",
  };

  return (
    <Badge variant={variantMap[status]} className={classMap[status]}>
      {t(status)}
    </Badge>
  );
}

export function VisitorTable({ visitors }: VisitorTableProps) {
  const t = useTranslations("admin.visitors");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  const handleCheckIn = (id: string) => {
    setActionId(id);
    startTransition(async () => {
      const result = await checkInVisitor(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("checkInSuccess"));
        router.refresh();
      }
      setActionId(null);
    });
  };

  const handleCheckOut = (id: string) => {
    setActionId(id);
    startTransition(async () => {
      const result = await checkOutVisitor(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("checkOutSuccess"));
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

  if (visitors.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.visitorName")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("table.apartment")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("table.accessCode")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("table.validFrom")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("table.validUntil")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                {t("table.empty")}
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
            <TableHead>{t("table.visitorName")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("table.apartment")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("table.accessCode")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("table.validFrom")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("table.validUntil")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visitors.map((visitor) => {
            const isActing = isPending && actionId === visitor.id;
            return (
              <TableRow key={visitor.id}>
                <TableCell className="font-medium">
                  {formatGroupLabel(
                    visitor.visitor_name,
                    visitor.visitor_companions?.length ?? 0,
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{visitor.apartments?.unit_number ?? "—"}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="font-mono text-sm font-semibold tracking-wider">
                    {visitor.access_code}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {formatDate(visitor.valid_from)}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {formatDate(visitor.valid_until)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={visitor.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {visitor.status === "expected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckIn(visitor.id)}
                        disabled={isPending}
                        aria-label={t("checkIn")}
                      >
                        {isActing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogIn className="h-4 w-4" />
                        )}
                        <span className="ml-1 hidden sm:inline">
                          {t("checkIn")}
                        </span>
                      </Button>
                    )}
                    {visitor.status === "checked_in" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckOut(visitor.id)}
                        disabled={isPending}
                        aria-label={t("checkOut")}
                      >
                        {isActing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}
                        <span className="ml-1 hidden sm:inline">
                          {t("checkOut")}
                        </span>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/admin/visitors/${visitor.id}`}>
                        <Eye className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">
                          {t("table.viewDetails")}
                        </span>
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
