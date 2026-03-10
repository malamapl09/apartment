"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/currency";

interface MyBalanceCardProps {
  balance: number;
}

export function MyBalanceCard({ balance }: MyBalanceCardProps) {
  const t = useTranslations("portal.fees");

  const isAllClear = balance === 0;

  return (
    <Card
      className={cn(
        "border-2",
        isAllClear
          ? "border-green-200 dark:border-green-800"
          : "border-destructive/30"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
          {isAllClear ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
          {t("outstandingBalance")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p
          className={cn(
            "text-4xl font-bold tabular-nums tracking-tight",
            isAllClear ? "text-green-600 dark:text-green-400" : "text-destructive"
          )}
        >
          {formatCurrency(balance)}
        </p>
        <p className="text-sm text-muted-foreground">
          {isAllClear ? t("noOutstanding") : t("noOutstandingDescription")}
        </p>
      </CardContent>
    </Card>
  );
}
