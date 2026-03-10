"use client";

import { Fragment, useState } from "react";
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
import { ChevronDown, ChevronRight } from "lucide-react";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  building_id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  profiles: { id: string; full_name: string | null; email: string } | null;
}

interface AuditLogTableProps {
  logs: AuditLog[];
  total: number;
  page: number;
  perPage: number;
  locale: string;
}

const actionBadgeConfig: Record<string, { className: string }> = {
  create: {
    className:
      "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 border-green-200",
  },
  update: {
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 border-blue-200",
  },
  delete: {
    className:
      "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20 border-red-200",
  },
};

function JsonView({ data, label }: { data: Record<string, unknown> | null; label: string }) {
  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-64 overflow-y-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export function AuditLogTable({ logs, total, page, perPage, locale }: AuditLogTableProps) {
  const t = useTranslations("admin.audit");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("noResults")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead>{t("columns.timestamp")}</TableHead>
              <TableHead>{t("columns.user")}</TableHead>
              <TableHead>{t("columns.action")}</TableHead>
              <TableHead>{t("columns.table")}</TableHead>
              <TableHead>{t("columns.recordId")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const isExpanded = expandedRows.has(log.id);
              const badgeCfg = actionBadgeConfig[log.action] ?? {
                className: "",
              };
              const hasDetails =
                (log.old_data && Object.keys(log.old_data).length > 0) ||
                (log.new_data && Object.keys(log.new_data).length > 0);

              return (
                <Fragment key={log.id}>
                  <TableRow
                    className={cn(
                      hasDetails && "cursor-pointer hover:bg-muted/50",
                      isExpanded && "bg-muted/30"
                    )}
                    onClick={() => hasDetails && toggleRow(log.id)}
                  >
                    <TableCell className="w-[40px]">
                      {hasDetails && (
                        isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "PPp")}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.profiles ? (
                        <div>
                          <p className="text-sm font-medium">
                            {log.profiles.full_name || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.profiles.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {log.user_id ? log.user_id.slice(0, 8) + "..." : "System"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("capitalize", badgeCfg.className)}
                      >
                        {["create", "update", "delete"].includes(log.action)
                          ? t(`actions.${log.action}` as "actions.create" | "actions.update" | "actions.delete")
                          : log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">{log.table_name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono text-muted-foreground">
                        {log.record_id ? log.record_id.slice(0, 8) + "..." : "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${log.id}-details`}>
                      <TableCell colSpan={6} className="bg-muted/20 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <JsonView data={log.old_data} label={t("oldData")} />
                          <JsonView data={log.new_data} label={t("newData")} />
                        </div>
                        {!log.old_data && !log.new_data && (
                          <p className="text-sm text-muted-foreground">
                            {t("noResults")}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <PaginationControls total={total} page={page} perPage={perPage} />
    </div>
  );
}
