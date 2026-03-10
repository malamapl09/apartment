"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Users, MapPin, Calendar, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import type { BuildingWithStats } from "@/types";

interface BuildingCardProps {
  building: BuildingWithStats;
}

export function BuildingCard({ building }: BuildingCardProps) {
  const t = useTranslations("superAdmin.buildings");
  const params = useParams<{ locale: string }>();
  const locale = params.locale;

  return (
    <Link href={`/${locale}/super-admin/buildings/${building.id}`}>
      <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <CardTitle className="text-base leading-snug">
              {building.name}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Address */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="line-clamp-2">
              {building.address ?? (
                <span className="italic">{t("address")}</span>
              )}
            </span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-muted/50 px-2 py-2">
              <p className="text-xs text-muted-foreground mb-0.5">
                {t("units")}
              </p>
              <p className="text-sm font-semibold">
                {building.total_units ?? 0}
              </p>
            </div>
            <div className="rounded-md bg-muted/50 px-2 py-2">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Users className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t("users")}</p>
              </div>
              <p className="text-sm font-semibold">{building.user_count}</p>
            </div>
            <div className="rounded-md bg-muted/50 px-2 py-2">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t("admins")}</p>
              </div>
              <p className="text-sm font-semibold">{building.admin_count}</p>
            </div>
          </div>

          {/* Created date */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {t("created")}:{" "}
              {format(new Date(building.created_at), "MMM d, yyyy")}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
