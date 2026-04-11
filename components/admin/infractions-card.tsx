"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";

import type { Infraction, InfractionSeverity, PublicSpace } from "@/types";
import { deleteInfraction } from "@/lib/actions/infractions";

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
import InfractionFormDialog from "@/components/admin/infraction-form-dialog";

type InfractionRow = Infraction & {
  public_spaces: { id: string; name: string } | null;
};

interface Props {
  profileId: string;
  infractions: InfractionRow[];
  spaces: Pick<PublicSpace, "id" | "name">[];
}

const severityVariant: Record<InfractionSeverity, "secondary" | "default" | "destructive"> = {
  minor: "secondary",
  major: "default",
  severe: "destructive",
};

export default function InfractionsCard({
  profileId,
  infractions,
  spaces,
}: Props) {
  const t = useTranslations("admin.owners.infractions");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteInfraction(id);
      if ("success" in result && result.success) {
        toast.success(t("deleteSuccess"));
        router.refresh();
      } else if ("error" in result) {
        toast.error(result.error || t("deleteError"));
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
        <InfractionFormDialog profileId={profileId} spaces={spaces} />
      </CardHeader>
      <CardContent>
        {infractions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("empty")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.occurredAt")}</TableHead>
                <TableHead>{t("columns.severity")}</TableHead>
                <TableHead>{t("columns.space")}</TableHead>
                <TableHead>{t("columns.description")}</TableHead>
                <TableHead className="text-right">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {infractions.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-xs">
                    {format(new Date(i.occurred_at), "PP")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={severityVariant[i.severity]}>
                      {t(`severity.${i.severity}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {i.public_spaces?.name ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={i.description}>
                    {i.description}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("deleteConfirmTitle")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("deleteConfirmDescription")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {t("form.cancel")}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(i.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t("delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
