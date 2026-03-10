"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, AlertCircle, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

interface FinancialSummaryProps {
  summary: {
    totalCharged: number;
    totalCollected: number;
    outstanding: number;
    collectionRate: number;
  };
}

export function FinancialSummary({ summary }: FinancialSummaryProps) {
  const t = useTranslations("admin.fees.summary");

  const stats = [
    {
      title: t("totalCharged"),
      value: formatCurrency(summary.totalCharged),
      icon: DollarSign,
      className: "text-blue-600",
      bgClass: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: t("totalCollected"),
      value: formatCurrency(summary.totalCollected),
      icon: TrendingUp,
      className: "text-green-600",
      bgClass: "bg-green-50 dark:bg-green-950",
    },
    {
      title: t("outstanding"),
      value: formatCurrency(summary.outstanding),
      icon: AlertCircle,
      className: summary.outstanding > 0 ? "text-destructive" : "text-green-600",
      bgClass:
        summary.outstanding > 0
          ? "bg-red-50 dark:bg-red-950"
          : "bg-green-50 dark:bg-green-950",
    },
    {
      title: t("collectionRate"),
      value: `${summary.collectionRate}%`,
      icon: Percent,
      className:
        summary.collectionRate >= 90
          ? "text-green-600"
          : summary.collectionRate >= 70
          ? "text-yellow-600"
          : "text-destructive",
      bgClass:
        summary.collectionRate >= 90
          ? "bg-green-50 dark:bg-green-950"
          : summary.collectionRate >= 70
          ? "bg-yellow-50 dark:bg-yellow-950"
          : "bg-red-50 dark:bg-red-950",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-full p-2 ${stat.bgClass}`}>
                <Icon className={`h-4 w-4 ${stat.className}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.className}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
