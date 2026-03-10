"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoreHorizontal, Download, Trash2, Loader2 } from "lucide-react";
import type { DocumentWithUploader, DocumentCategory, DocumentTarget } from "@/types";
import { format } from "date-fns";
import { toast } from "sonner";

interface DocumentTableProps {
  documents: DocumentWithUploader[];
  onDelete: (id: string) => Promise<{ error?: string; success?: boolean } | void>;
}

const categoryVariantMap: Record<DocumentCategory, "default" | "secondary" | "outline" | "destructive"> = {
  rules: "default",
  minutes: "secondary",
  contracts: "destructive",
  notices: "outline",
  forms: "secondary",
};

const targetVariantMap: Record<DocumentTarget, "default" | "secondary" | "outline"> = {
  all: "default",
  owners: "secondary",
  residents: "outline",
};

export function DocumentTable({ documents, onDelete }: DocumentTableProps) {
  const t = useTranslations("admin.documents");
  const tActions = useTranslations("actions");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const result = await onDelete(deleteId);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("deleteSuccess"));
      }
    } catch {
      toast.error(t("errors.deleteFailed"));
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const getCategoryLabel = (category: DocumentCategory) => {
    return t(`categories.${category}`);
  };

  const getTargetLabel = (target: DocumentTarget) => {
    if (target === "all") return t("targetAll");
    if (target === "owners") return t("targetOwners");
    return t("targetResidents");
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("table.empty")}</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.title")}</TableHead>
            <TableHead>{t("table.category")}</TableHead>
            <TableHead>{t("table.target")}</TableHead>
            <TableHead>{t("table.version")}</TableHead>
            <TableHead>{t("table.uploadedBy")}</TableHead>
            <TableHead>{t("table.date")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium max-w-xs">
                <div>
                  <p className="truncate">{doc.title}</p>
                  {doc.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {doc.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={categoryVariantMap[doc.category]}>
                  {getCategoryLabel(doc.category)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={targetVariantMap[doc.target]}>
                  {getTargetLabel(doc.target)}
                </Badge>
              </TableCell>
              <TableCell>v{doc.version}</TableCell>
              <TableCell>
                {doc.profiles?.full_name ?? "—"}
              </TableCell>
              <TableCell>
                {format(new Date(doc.created_at), "dd MMM yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download={doc.file_name}>
                        <Download className="mr-2 h-4 w-4" />
                        {t("table.download")}
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => setDeleteId(doc.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {tActions("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm")}</DialogTitle>
            <DialogDescription>
              {t("noDocumentsDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={isDeleting}
            >
              {tActions("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tActions("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
