"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

// Map status values to translation keys
const statusOptions = [
  "pending_payment",
  "payment_submitted",
  "confirmed",
  "cancelled",
  "completed",
] as const;

export function ReservationFilters() {
  const t = useTranslations("admin.reservations.filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") || "";
  const currentSpaceId = searchParams.get("space_id") || "";
  const currentDateFrom = searchParams.get("date_from") || "";
  const currentDateTo = searchParams.get("date_to") || "";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push(pathname);
  };

  const hasActiveFilters = currentStatus || currentSpaceId || currentDateFrom || currentDateTo;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="status">{t("status")}</Label>
          <Select value={currentStatus} onValueChange={(value) => updateFilter("status", value)}>
            <SelectTrigger id="status">
              <SelectValue placeholder={t("statusPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("allStatuses")}</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`statusOptions.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-2">
          <Label htmlFor="date_from">{t("dateFrom")}</Label>
          <Input
            id="date_from"
            type="date"
            value={currentDateFrom}
            onChange={(e) => updateFilter("date_from", e.target.value)}
          />
        </div>

        {/* Date To */}
        <div className="space-y-2">
          <Label htmlFor="date_to">{t("dateTo")}</Label>
          <Input
            id="date_to"
            type="date"
            value={currentDateTo}
            onChange={(e) => updateFilter("date_to", e.target.value)}
          />
        </div>

        {/* Clear Filters */}
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            {t("clearFilters")}
          </Button>
        </div>
      </div>
    </div>
  );
}
