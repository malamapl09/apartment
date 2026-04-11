"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, LogIn, LogOut, CheckCheck } from "lucide-react";

import type { VisitorWithCompanions } from "@/types";
import {
  checkInVisitorMember,
  checkOutVisitorMember,
  checkInVisitorGroup,
  checkOutVisitorGroup,
} from "@/lib/actions/admin-visitors";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  visitor: VisitorWithCompanions;
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function VisitorGuestsCard({ visitor }: Props) {
  const t = useTranslations("admin.visitors.guests");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const companions = [...(visitor.visitor_companions ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const totalGuests = 1 + companions.length;

  const handleAction = (
    action: () => Promise<{ success?: boolean; error?: string }>,
    successMsg: string,
  ) => {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(successMsg);
        router.refresh();
      }
    });
  };

  const anyExpected =
    visitor.checked_in_at === null ||
    companions.some((c) => c.checked_in_at === null);
  const anyInside = companions.some(
    (c) => c.checked_in_at !== null && c.checked_out_at === null,
  ) || (visitor.checked_in_at !== null && visitor.checked_out_at === null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          {t("title")} ({totalGuests})
        </CardTitle>
        <div className="flex gap-2">
          {anyExpected && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                handleAction(
                  () => checkInVisitorGroup(visitor.id),
                  t("checkAllInSuccess"),
                )
              }
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              {t("checkAllIn")}
            </Button>
          )}
          {anyInside && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                handleAction(
                  () => checkOutVisitorGroup(visitor.id),
                  t("checkAllOutSuccess"),
                )
              }
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              {t("checkAllOut")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <GuestRow
            label={visitor.visitor_name}
            isPrimary
            checkedInAt={visitor.checked_in_at}
            checkedOutAt={visitor.checked_out_at}
            onCheckIn={() =>
              handleAction(
                () => checkInVisitorMember(visitor.id, null),
                t("checkInSuccess"),
              )
            }
            onCheckOut={() =>
              handleAction(
                () => checkOutVisitorMember(visitor.id, null),
                t("checkOutSuccess"),
              )
            }
            isPending={isPending}
            t={t}
          />
          {companions.map((c) => (
            <GuestRow
              key={c.id}
              label={c.name}
              checkedInAt={c.checked_in_at}
              checkedOutAt={c.checked_out_at}
              onCheckIn={() =>
                handleAction(
                  () => checkInVisitorMember(visitor.id, c.id),
                  t("checkInSuccess"),
                )
              }
              onCheckOut={() =>
                handleAction(
                  () => checkOutVisitorMember(visitor.id, c.id),
                  t("checkOutSuccess"),
                )
              }
              isPending={isPending}
              t={t}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface GuestRowProps {
  label: string;
  isPrimary?: boolean;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
  isPending: boolean;
  t: (key: string) => string;
}

function GuestRow({
  label,
  isPrimary,
  checkedInAt,
  checkedOutAt,
  onCheckIn,
  onCheckOut,
  isPending,
  t,
}: GuestRowProps) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3 gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{label}</span>
          {isPrimary && (
            <Badge variant="secondary" className="text-xs">
              {t("primary")}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {checkedInAt ? (
            checkedOutAt ? (
              <>
                {t("checkedIn")} {formatTime(checkedInAt)} ·{" "}
                {t("checkedOut")} {formatTime(checkedOutAt)}
              </>
            ) : (
              <>
                {t("checkedIn")} {formatTime(checkedInAt)}
              </>
            )
          ) : (
            t("notArrived")
          )}
        </div>
      </div>

      {checkedInAt === null && (
        <Button size="sm" onClick={onCheckIn} disabled={isPending}>
          <LogIn className="h-4 w-4 mr-1" />
          {t("checkIn")}
        </Button>
      )}
      {checkedInAt !== null && checkedOutAt === null && (
        <Button
          size="sm"
          variant="outline"
          onClick={onCheckOut}
          disabled={isPending}
        >
          <LogOut className="h-4 w-4 mr-1" />
          {t("checkOut")}
        </Button>
      )}
    </div>
  );
}
