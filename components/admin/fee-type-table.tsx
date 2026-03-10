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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, RefreshCw } from "lucide-react";
import type { FeeType } from "@/types";
import { FeeTypeForm } from "@/components/admin/fee-type-form";
import { formatCurrency } from "@/lib/utils/currency";

interface FeeTypeTableProps {
  feeTypes: FeeType[];
}

const CATEGORY_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  maintenance_fee: "default",
  common_area: "secondary",
  parking: "outline",
  special_assessment: "destructive",
  other: "secondary",
};

export function FeeTypeTable({ feeTypes }: FeeTypeTableProps) {
  const t = useTranslations("admin.fees");
  const tLabels = useTranslations("labels");
  const [editingFeeType, setEditingFeeType] = useState<FeeType | null>(null);

  if (feeTypes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
        <p className="font-medium text-muted-foreground">{t("noFeeTypes")}</p>
        <p className="text-sm text-muted-foreground">
          {t("noFeeTypesDescription")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("feeTypeName")}</TableHead>
              <TableHead>{t("feeTypeCategory")}</TableHead>
              <TableHead>{t("defaultAmount")}</TableHead>
              <TableHead>{t("isRecurring")}</TableHead>
              <TableHead>{tLabels("description")}</TableHead>
              <TableHead className="w-[80px]">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feeTypes.map((feeType) => (
              <TableRow key={feeType.id}>
                <TableCell className="font-medium">{feeType.name}</TableCell>
                <TableCell>
                  <Badge variant={CATEGORY_VARIANT[feeType.category] ?? "secondary"}>
                    {t(`feeCategory.${feeType.category}`)}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold tabular-nums">
                  {formatCurrency(feeType.default_amount)}
                </TableCell>
                <TableCell>
                  {feeType.is_recurring ? (
                    <Badge variant="outline" className="gap-1">
                      <RefreshCw className="h-3 w-3" />
                      {t("isRecurring")}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                  {feeType.description ?? "—"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingFeeType(feeType)}
                    aria-label={`${t("editFeeType")}: ${feeType.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!editingFeeType}
        onOpenChange={(open) => !open && setEditingFeeType(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editFeeType")}</DialogTitle>
          </DialogHeader>
          {editingFeeType && (
            <FeeTypeForm
              feeType={editingFeeType}
              onSuccess={() => setEditingFeeType(null)}
              onCancel={() => setEditingFeeType(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
