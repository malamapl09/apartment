"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search, Loader2, UserCheck, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { lookupByAccessCode } from "@/lib/actions/admin-visitors";
import type { VisitorStatus, VisitorWithDetails } from "@/types";

function StatusBadge({ status }: { status: VisitorStatus }) {
  const t = useTranslations("admin.visitors.status");

  const classMap: Record<VisitorStatus, string> = {
    expected: "bg-blue-100 text-blue-800",
    checked_in: "bg-green-100 text-green-800",
    checked_out: "bg-gray-100 text-gray-800",
    expired: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <Badge className={classMap[status]} variant="outline">
      {t(status)}
    </Badge>
  );
}

export function VisitorLookup() {
  const t = useTranslations("admin.visitors");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<VisitorWithDetails | null | "not_found">(
    null
  );
  const [isPending, startTransition] = useTransition();

  const handleLookup = () => {
    if (!code.trim()) return;
    startTransition(async () => {
      const response = await lookupByAccessCode(code.trim());
      if (response.error === "not_found" || !response.data) {
        setResult("not_found");
      } else {
        setResult(response.data as VisitorWithDetails);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLookup();
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder={t("lookupPlaceholder")}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setResult(null);
          }}
          onKeyDown={handleKeyDown}
          maxLength={6}
          className="font-mono uppercase"
          aria-label={t("lookup")}
        />
        <Button onClick={handleLookup} disabled={isPending || !code.trim()}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className="ml-2">{t("lookup")}</span>
        </Button>
      </div>

      {result === "not_found" && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            {t("lookupNotFound")}
          </CardContent>
        </Card>
      )}

      {result && result !== "not_found" && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="h-5 w-5" />
                {result.visitor_name}
              </CardTitle>
              <StatusBadge status={result.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>
                {t("apartment")}:{" "}
                <span className="font-medium text-foreground">
                  {result.apartments?.unit_number ?? "—"}
                </span>
              </span>
            </div>
            <div className="flex gap-4 text-muted-foreground">
              <span>
                {t("validFrom")}:{" "}
                <span className="font-medium text-foreground">
                  {formatDate(result.valid_from)}
                </span>
              </span>
              <span>
                {t("validUntil")}:{" "}
                <span className="font-medium text-foreground">
                  {formatDate(result.valid_until)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t("accessCode")}:</span>
              <span className="font-mono font-bold tracking-widest">
                {result.access_code}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
