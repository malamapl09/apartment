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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const actionOptions = ["create", "update", "delete"] as const;

const tableOptions = [
  "buildings",
  "profiles",
  "apartments",
  "charges",
  "payments",
  "fee_types",
  "spaces",
  "reservations",
  "announcements",
  "maintenance_requests",
  "visitors",
  "documents",
] as const;

interface AuditFiltersProps {
  users: { id: string; full_name: string | null; email: string }[];
}

export function AuditFilters({ users }: AuditFiltersProps) {
  const t = useTranslations("admin.audit");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentAction = searchParams.get("action") || "";
  const currentTable = searchParams.get("table_name") || "";
  const currentUser = searchParams.get("user_id") || "";
  const currentDateFrom = searchParams.get("date_from") || "";
  const currentDateTo = searchParams.get("date_to") || "";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to page 1 when filters change
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push(pathname);
  };

  const hasActiveFilters =
    currentAction || currentTable || currentUser || currentDateFrom || currentDateTo;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Action Filter */}
        <div className="space-y-2">
          <Label htmlFor="action">{t("filters.action")}</Label>
          <Select
            value={currentAction}
            onValueChange={(value) =>
              updateFilter("action", value === "all" ? "" : value)
            }
          >
            <SelectTrigger id="action">
              <SelectValue placeholder={t("filters.allActions")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allActions")}</SelectItem>
              {actionOptions.map((action) => (
                <SelectItem key={action} value={action}>
                  {t(`actions.${action}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table Filter */}
        <div className="space-y-2">
          <Label htmlFor="table_name">{t("filters.table")}</Label>
          <Select
            value={currentTable}
            onValueChange={(value) =>
              updateFilter("table_name", value === "all" ? "" : value)
            }
          >
            <SelectTrigger id="table_name">
              <SelectValue placeholder={t("filters.allTables")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allTables")}</SelectItem>
              {tableOptions.map((table) => (
                <SelectItem key={table} value={table}>
                  {table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* User Filter */}
        <div className="space-y-2">
          <Label htmlFor="user_id">{t("filters.user")}</Label>
          <Select
            value={currentUser}
            onValueChange={(value) =>
              updateFilter("user_id", value === "all" ? "" : value)
            }
          >
            <SelectTrigger id="user_id">
              <SelectValue placeholder={t("filters.allUsers")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allUsers")}</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-2">
          <Label htmlFor="date_from">{t("filters.dateFrom")}</Label>
          <Input
            id="date_from"
            type="date"
            value={currentDateFrom}
            onChange={(e) => updateFilter("date_from", e.target.value)}
          />
        </div>

        {/* Date To */}
        <div className="space-y-2">
          <Label htmlFor="date_to">{t("filters.dateTo")}</Label>
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
