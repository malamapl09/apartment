"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const statusOptions = [
  "open",
  "in_progress",
  "waiting_parts",
  "resolved",
  "closed",
] as const;

const priorityOptions = ["low", "medium", "high", "urgent"] as const;

const categoryOptions = [
  "plumbing",
  "electrical",
  "hvac",
  "structural",
  "pest_control",
  "general",
] as const;

export function MaintenanceFilters() {
  const t = useTranslations("admin.maintenance");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") || "";
  const currentPriority = searchParams.get("priority") || "";
  const currentCategory = searchParams.get("category") || "";

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

  const hasActiveFilters = currentStatus || currentPriority || currentCategory;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="status">{t("filters.status")}</Label>
          <Select
            value={currentStatus}
            onValueChange={(value) => updateFilter("status", value === "all" ? "" : value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder={t("filters.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className="space-y-2">
          <Label htmlFor="priority">{t("filters.priority")}</Label>
          <Select
            value={currentPriority}
            onValueChange={(value) => updateFilter("priority", value === "all" ? "" : value)}
          >
            <SelectTrigger id="priority">
              <SelectValue placeholder={t("filters.allPriorities")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allPriorities")}</SelectItem>
              {priorityOptions.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {t(`priority.${priority}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <Label htmlFor="category">{t("filters.category")}</Label>
          <Select
            value={currentCategory}
            onValueChange={(value) => updateFilter("category", value === "all" ? "" : value)}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder={t("filters.allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
              {categoryOptions.map((category) => (
                <SelectItem key={category} value={category}>
                  {t(`category.${category}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            {t("filters.clearFilters")}
          </Button>
        </div>
      </div>
    </div>
  );
}
