"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Send, CheckCircle2, Clock } from "lucide-react";

import { sendAcknowledgmentReminder } from "@/lib/actions/document-acknowledgments";
import type { DocumentAudienceMember, DocumentAcknowledgment } from "@/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  documentId: string;
  audience: DocumentAudienceMember[];
  // Ack timestamps, keyed by profile_id, so we can display when each
  // acknowledged member confirmed.
  ackTimestamps: Record<string, string>;
}

export default function DocumentAcknowledgmentStatus({
  documentId,
  audience,
  ackTimestamps,
}: Props) {
  const t = useTranslations("admin.documents.acknowledgments");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const acked = audience.filter((m) => m.has_acked);
  const pending = audience.filter((m) => !m.has_acked);
  const total = audience.length;
  const ackedCount = acked.length;
  const pct = total === 0 ? 0 : Math.round((ackedCount / total) * 100);

  const handleReminder = () => {
    startTransition(async () => {
      const result = await sendAcknowledgmentReminder(documentId);
      if ("success" in result && result.success) {
        toast.success(
          t("reminderSuccess", { count: result.notified ?? 0 }),
        );
        router.refresh();
      } else if ("error" in result) {
        toast.error(result.error || t("reminderError"));
      }
    });
  };

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("empty")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("summary", { acked: ackedCount, total, percent: pct })}
          </CardDescription>
        </div>
        {pending.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleReminder}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {t("sendReminder")}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Acknowledged */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              {t("acknowledgedHeading", { count: ackedCount })}
            </h4>
            {acked.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noneAcknowledged")}
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {acked.map((m) => (
                  <li key={m.profile_id} className="flex justify-between gap-2">
                    <span>{m.full_name ?? m.email}</span>
                    {ackTimestamps[m.profile_id] && (
                      <span className="text-xs text-muted-foreground">
                        {format(
                          new Date(ackTimestamps[m.profile_id]),
                          "dd MMM yyyy",
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pending */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-amber-600" />
              {t("pendingHeading", { count: pending.length })}
            </h4>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("nonePending")}
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {pending.map((m) => (
                  <li key={m.profile_id} className="flex flex-col">
                    <span>{m.full_name ?? m.email}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.email}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// keep the type export near the consumer so the page can construct the lookup.
export type { DocumentAcknowledgment };
