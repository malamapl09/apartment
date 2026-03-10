"use client";

import { useState } from "react";
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
import { CreditCard } from "lucide-react";
import type { ChargeWithDetails } from "@/types";
import { RecordPaymentForm } from "@/components/admin/record-payment-form";
import { format } from "date-fns";
import { formatCurrency, formatMonthShort } from "@/lib/utils/currency";

interface ChargesTableProps {
  charges: ChargeWithDetails[];
}

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: "secondary",
  paid: "default",
  overdue: "destructive",
  partial: "outline",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800",
  paid: "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800",
  overdue: "",
  partial: "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800",
};


export function ChargesTable({ charges }: ChargesTableProps) {
  const t = useTranslations("admin.fees");
  const [selectedCharge, setSelectedCharge] = useState<ChargeWithDetails | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  if (charges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="font-medium text-muted-foreground">{t("noCharges")}</p>
      </div>
    );
  }

  const handleRecordPayment = (charge: ChargeWithDetails) => {
    setSelectedCharge(charge);
    setShowPaymentDialog(true);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.apartment")}</TableHead>
              <TableHead>{t("table.feeType")}</TableHead>
              <TableHead>{t("table.amount")}</TableHead>
              <TableHead>{t("table.dueDate")}</TableHead>
              <TableHead>{t("table.period")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead className="w-[120px]">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charges.map((charge) => (
              <TableRow key={charge.id}>
                <TableCell className="font-medium">
                  {charge.apartments?.unit_number ?? "—"}
                </TableCell>
                <TableCell>{charge.fee_types?.name ?? "—"}</TableCell>
                <TableCell className="font-semibold tabular-nums">
                  {formatCurrency(charge.amount)}
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(charge.due_date), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-sm tabular-nums">
                  {formatMonthShort(charge.period_month)} {charge.period_year}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={STATUS_VARIANT[charge.status] ?? "secondary"}
                    className={STATUS_CLASS[charge.status] ?? ""}
                  >
                    {t(`chargeStatus.${charge.status}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {charge.status !== "paid" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRecordPayment(charge)}
                      className="gap-1 text-xs"
                    >
                      <CreditCard className="h-3 w-3" />
                      {t("table.recordPayment")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedCharge && (
        <RecordPaymentForm
          charge={selectedCharge}
          open={showPaymentDialog}
          onOpenChange={(open) => {
            setShowPaymentDialog(open);
            if (!open) setSelectedCharge(null);
          }}
        />
      )}
    </>
  );
}
