"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Wrench, UserCheck, Bell } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type SummaryData = {
  pendingCharges: number;
  pendingAmount: number;
  activeRequests: number;
  upcomingVisitors: number;
  unreadNotifications: number;
};

export default function PortalSummaryCards({
  data,
  locale,
}: {
  data: SummaryData;
  locale: string;
}) {
  const t = useTranslations("portal.summary");

  const cards = [
    {
      title: t("pendingCharges"),
      value: data.pendingCharges,
      subtitle: data.pendingAmount > 0 ? formatCurrency(data.pendingAmount) : undefined,
      icon: DollarSign,
      href: `/${locale}/portal/fees`,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: t("activeRequests"),
      value: data.activeRequests,
      icon: Wrench,
      href: `/${locale}/portal/maintenance`,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: t("upcomingVisitors"),
      value: data.upcomingVisitors,
      icon: UserCheck,
      href: `/${locale}/portal/visitors`,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: t("unreadNotifications"),
      value: data.unreadNotifications,
      icon: Bell,
      href: `/${locale}/portal`,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.subtitle}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {t("viewAll")}
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
