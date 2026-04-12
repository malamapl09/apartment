"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";

import { removeBlacklistEntry } from "@/lib/actions/visitor-blacklist";
import type { VisitorBlacklistEntry } from "@/types";

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

type BlacklistRow = VisitorBlacklistEntry & {
  profiles: { id: string; full_name: string | null } | null;
};

interface Props {
  entries: BlacklistRow[];
}

export default function VisitorBlacklistTable({ entries }: Props) {
  const t = useTranslations("admin.visitors.blacklist");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await removeBlacklistEntry(id);
      if ("success" in result && result.success) {
        toast.success(t("deleteSuccess"));
        router.refresh();
      } else if ("error" in result) {
        toast.error(result.error || t("addError"));
      }
    });
  };

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10">
        {t("empty")}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("columns.name")}</TableHead>
          <TableHead>{t("columns.idNumber")}</TableHead>
          <TableHead>{t("columns.phone")}</TableHead>
          <TableHead>{t("columns.reason")}</TableHead>
          <TableHead>{t("columns.addedBy")}</TableHead>
          <TableHead className="text-right">{t("columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="font-medium">{e.name}</TableCell>
            <TableCell className="text-sm">
              {e.id_number || <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell className="text-sm">
              {e.phone || <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell className="max-w-xs truncate" title={e.reason}>
              {e.reason}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {e.profiles?.full_name ?? "—"}
              <div>{format(new Date(e.created_at), "PP")}</div>
            </TableCell>
            <TableCell className="text-right">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("delete")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("deleteConfirm")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("form.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(e.id)}
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
  );
}
