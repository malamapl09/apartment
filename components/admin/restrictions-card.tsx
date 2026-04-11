"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

import type { PublicSpace, UserRestriction } from "@/types";
import { revokeRestriction } from "@/lib/actions/restrictions";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import RestrictionFormDialog from "@/components/admin/restriction-form-dialog";

type RestrictionRow = UserRestriction & {
  public_spaces: { id: string; name: string } | null;
};

interface Props {
  profileId: string;
  restrictions: RestrictionRow[];
  spaces: Pick<PublicSpace, "id" | "name">[];
}

type Status = "active" | "scheduled" | "expired" | "revoked";

function getStatus(r: RestrictionRow): Status {
  if (r.revoked_at) return "revoked";
  const now = new Date();
  const startsAt = new Date(r.starts_at);
  if (startsAt > now) return "scheduled";
  if (r.ends_at && new Date(r.ends_at) <= now) return "expired";
  return "active";
}

export default function RestrictionsCard({
  profileId,
  restrictions,
  spaces,
}: Props) {
  const t = useTranslations("admin.owners.restrictions");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRevoke = (id: string) => {
    startTransition(async () => {
      const result = await revokeRestriction(id);
      if ("success" in result && result.success) {
        toast.success(t("revokeSuccess"));
        router.refresh();
      } else if ("error" in result) {
        toast.error(result.error || t("revokeError"));
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <RestrictionFormDialog profileId={profileId} spaces={spaces} />
      </CardHeader>
      <CardContent>
        {restrictions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("empty")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.space")}</TableHead>
                <TableHead>{t("columns.reason")}</TableHead>
                <TableHead>{t("columns.period")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="text-right">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restrictions.map((r) => {
                const status = getStatus(r);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.public_spaces?.name ?? t("form.allSpaces")}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={r.reason}>
                      {r.reason}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{format(new Date(r.starts_at), "PP")}</div>
                      <div className="text-muted-foreground">
                        {r.ends_at
                          ? format(new Date(r.ends_at), "PP")
                          : t("indefinite")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          status === "active"
                            ? "destructive"
                            : status === "scheduled"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {t(`status.${status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {status === "active" || status === "scheduled" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isPending}
                            >
                              {isPending && (
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              )}
                              {t("revoke")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t("confirmRevoke")}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("confirmRevokeDescription")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                {t("form.cancel")}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRevoke(r.id)}
                              >
                                {t("revoke")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
