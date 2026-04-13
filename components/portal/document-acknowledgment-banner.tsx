"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { FileWarning } from "lucide-react";

import type { PendingAcknowledgment } from "@/types";
import { summarizePendingAcks } from "@/lib/documents/helpers";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Props {
  pending: PendingAcknowledgment[];
  locale: string;
}

export default function DocumentAcknowledgmentBanner({
  pending,
  locale,
}: Props) {
  const t = useTranslations("portal.documents.banner");

  if (pending.length === 0) return null;

  const { titlesShown, moreCount } = summarizePendingAcks(pending, 3);
  const preview = pending.slice(0, titlesShown.length);

  return (
    <Alert
      variant="destructive"
      className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 [&>svg]:text-amber-600"
    >
      <FileWarning className="h-4 w-4" />
      <AlertTitle>{t("title")}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{t("description")}</p>
        <ul className="space-y-1 text-sm list-disc pl-5">
          {preview.map((doc) => (
            <li key={doc.document_id}>
              <span className="font-medium">{doc.title}</span>
            </li>
          ))}
          {moreCount > 0 && (
            <li className="list-none text-xs text-amber-700 dark:text-amber-300">
              {t("morePending", { count: moreCount })}
            </li>
          )}
        </ul>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="border-amber-600/50 bg-transparent hover:bg-amber-100 dark:hover:bg-amber-900/40"
        >
          <Link href={`/${locale}/portal/documents`}>{t("viewAll")}</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
