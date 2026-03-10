"use client";

import { useTranslations } from "next-intl";
import { Package as PackageIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PackageStatus } from "@/types";

interface PackageItem {
  id: string;
  description: string;
  carrier: string | null;
  tracking_number: string | null;
  status: PackageStatus;
  received_at: string;
  picked_up_at: string | null;
  apartments: { id: string; unit_number: string };
}

interface MyPackagesListProps {
  packages: PackageItem[];
}

function StatusBadge({ status, t }: { status: PackageStatus; t: (key: string) => string }) {
  const classMap: Record<PackageStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    notified: "bg-blue-100 text-blue-800",
    picked_up: "bg-green-100 text-green-800",
  };

  return (
    <Badge className={classMap[status]} variant="outline">
      {t(`status.${status}`)}
    </Badge>
  );
}

export function MyPackagesList({ packages }: MyPackagesListProps) {
  const t = useTranslations("portal.packages");

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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <PackageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("noPackages")}</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {t("noPackagesDescription")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {packages.map((pkg) => (
        <Card key={pkg.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{pkg.description}</CardTitle>
                {pkg.carrier && (
                  <CardDescription>{pkg.carrier}</CardDescription>
                )}
              </div>
              <StatusBadge status={pkg.status} t={t} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>
                <span className="block font-medium text-foreground">
                  {t("receivedAt")}
                </span>
                {formatDate(pkg.received_at)}
              </div>
              {pkg.picked_up_at && (
                <div>
                  <span className="block font-medium text-foreground">
                    {t("pickedUpAt")}
                  </span>
                  {formatDate(pkg.picked_up_at)}
                </div>
              )}
            </div>
            {pkg.tracking_number && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t("trackingNumber")}:
                </span>{" "}
                <span className="font-mono">{pkg.tracking_number}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
