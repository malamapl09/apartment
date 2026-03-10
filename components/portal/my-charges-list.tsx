"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import type { ChargeWithDetails } from "@/types";
import { cn } from "@/lib/utils";
import { formatCurrency, formatMonth } from "@/lib/utils/currency";

interface MyChargesListProps {
  charges: ChargeWithDetails[];
  emptyMessage?: string;
  emptyDescription?: string;
}

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: "secondary",
  paid: "default",
  overdue: "destructive",
  partial: "outline",
};

const STATUS_CLASS: Record<string, string> = {
  pending:
    "text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800",
  paid: "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800",
  overdue: "",
  partial:
    "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800",
};


export function MyChargesList({
  charges,
  emptyMessage,
  emptyDescription,
}: MyChargesListProps) {
  const t = useTranslations("portal.fees");

  if (charges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
        <DollarSign className="h-10 w-10 text-muted-foreground/40" />
        <p className="font-medium text-muted-foreground">
          {emptyMessage ?? t("noCharges")}
        </p>
        {emptyDescription && (
          <p className="text-sm text-muted-foreground">{emptyDescription}</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {charges.map((charge) => {
        const alreadyPaid = (charge.payments || []).reduce(
          (sum, p) => sum + p.amount,
          0
        );
        const remaining = Math.max(0, charge.amount - alreadyPaid);

        return (
          <Card
            key={charge.id}
            className={cn(
              "transition-colors",
              charge.status === "overdue" && "border-destructive/30"
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-semibold">
                  {charge.fee_types.name}
                </CardTitle>
                <Badge
                  variant={STATUS_VARIANT[charge.status] ?? "secondary"}
                  className={STATUS_CLASS[charge.status] ?? ""}
                >
                  {t(`status.${charge.status}`)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("dueDate")}:{" "}
                  <span className="font-medium text-foreground">
                    {format(new Date(charge.due_date), "MMM d, yyyy")}
                  </span>
                </span>
                <span>
                  {t("period")}:{" "}
                  <span className="font-medium text-foreground">
                    {formatMonth(charge.period_month)} {charge.period_year}
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{t("amountDue")}</p>
                  <p className="text-lg font-bold tabular-nums">
                    {formatCurrency(charge.amount)}
                  </p>
                </div>

                {alreadyPaid > 0 && (
                  <div className="space-y-0.5 text-right">
                    <p className="text-xs text-muted-foreground">{t("amountPaid")}</p>
                    <p className="text-lg font-semibold tabular-nums text-green-600">
                      {formatCurrency(alreadyPaid)}
                    </p>
                  </div>
                )}

                {charge.status === "partial" && (
                  <div className="space-y-0.5 text-right">
                    <p className="text-xs text-muted-foreground">{t("remaining")}</p>
                    <p className="text-lg font-semibold tabular-nums text-destructive">
                      {formatCurrency(remaining)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
