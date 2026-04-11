"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";

import type { UserRestriction } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Restriction = UserRestriction & {
  public_spaces: { id: string; name: string } | null;
};

interface Props {
  restrictions: Restriction[];
  currentSpaceId?: string;
}

export default function RestrictionBanner({
  restrictions,
  currentSpaceId,
}: Props) {
  const t = useTranslations("portal.reservations.restrictionsBanner");

  if (restrictions.length === 0) return null;

  const relevant = restrictions.filter(
    (r) => r.space_id === null || r.space_id === currentSpaceId,
  );

  if (relevant.length === 0) return null;

  return (
    <Alert
      variant="destructive"
      className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 [&>svg]:text-amber-600"
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{t("title")}</AlertTitle>
      <AlertDescription>
        <p className="mb-2">{t("description")}</p>
        <ul className="space-y-1 text-sm">
          {relevant.map((r) => (
            <li key={r.id}>
              <span className="font-medium">
                {r.public_spaces?.name ?? t("allSpaces")}
              </span>
              {" — "}
              {r.reason}
              {" · "}
              {r.ends_at
                ? t("endsOn", { date: format(new Date(r.ends_at), "PP") })
                : t("indefinite")}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
