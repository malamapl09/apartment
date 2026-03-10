"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Zap } from "lucide-react";
import { format } from "date-fns";
import type { ChargeWithDetails, FeeType } from "@/types";
import { FeeTypeTable } from "@/components/admin/fee-type-table";
import { FeeTypeForm } from "@/components/admin/fee-type-form";
import { ChargesTable } from "@/components/admin/charges-table";
import { GenerateChargesForm } from "@/components/admin/generate-charges-form";
import { formatCurrency, formatMonthShort } from "@/lib/utils/currency";

type PaymentRow = {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference_number: string | null;
  apartments: { unit_number: string } | null;
  charges: {
    period_month: number;
    period_year: number;
    fee_types: { name: string } | null;
  } | null;
};

interface FeesDashboardProps {
  feeTypes: FeeType[];
  charges: ChargeWithDetails[];
  payments: PaymentRow[];
}

export function FeesDashboard({
  feeTypes,
  charges,
  payments,
}: FeesDashboardProps) {
  const t = useTranslations("admin.fees");
  const [newFeeTypeOpen, setNewFeeTypeOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  return (
    <Tabs defaultValue="fee-types">
      <TabsList className="inline-flex">
        <TabsTrigger value="fee-types">{t("feeTypes")}</TabsTrigger>
        <TabsTrigger value="charges">{t("charges")}</TabsTrigger>
        <TabsTrigger value="payments">{t("payments")}</TabsTrigger>
      </TabsList>

      {/* Fee Types Tab */}
      <TabsContent value="fee-types" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("feeTypes")}</CardTitle>
                <CardDescription>{t("feeTypesDescription")}</CardDescription>
              </div>
              <div className="flex gap-2">
                {feeTypes.length > 0 && (
                  <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Zap className="mr-2 h-4 w-4" />
                        {t("generateCharges")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>{t("generateCharges")}</DialogTitle>
                      </DialogHeader>
                      <GenerateChargesForm
                        feeTypes={feeTypes}
                        onSuccess={() => setGenerateOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                )}

                <Dialog open={newFeeTypeOpen} onOpenChange={setNewFeeTypeOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      {t("newFeeType")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{t("newFeeType")}</DialogTitle>
                    </DialogHeader>
                    <FeeTypeForm
                      onSuccess={() => setNewFeeTypeOpen(false)}
                      onCancel={() => setNewFeeTypeOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FeeTypeTable feeTypes={feeTypes} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Charges Tab */}
      <TabsContent value="charges" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("charges")}</CardTitle>
            <CardDescription>{t("chargesDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChargesTable charges={charges} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Payments Tab */}
      <TabsContent value="payments" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("payments")}</CardTitle>
            <CardDescription>{t("paymentsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="font-medium text-muted-foreground">
                  {t("noPayments")}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("table.apartment")}</TableHead>
                      <TableHead>{t("table.feeType")}</TableHead>
                      <TableHead>{t("table.amount")}</TableHead>
                      <TableHead>{t("paymentDate")}</TableHead>
                      <TableHead>{t("paymentMethod")}</TableHead>
                      <TableHead>{t("referenceNumber")}</TableHead>
                      <TableHead>{t("table.period")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.apartments?.unit_number ?? "—"}
                        </TableCell>
                        <TableCell>
                          {payment.charges?.fee_types?.name ?? "—"}
                        </TableCell>
                        <TableCell className="font-semibold tabular-nums text-green-600">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(
                            new Date(payment.payment_date),
                            "MMM d, yyyy"
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {payment.payment_method ? (
                            <Badge variant="outline" className="capitalize text-xs">
                              {payment.payment_method.replace("_", " ")}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">
                          {payment.reference_number ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {payment.charges
                            ? `${formatMonthShort(payment.charges.period_month)} ${payment.charges.period_year}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
