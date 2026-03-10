"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  FileBarChart,
  Wrench,
  Download,
  Printer,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getFinancialReportData,
  getMaintenanceReportData,
  getChargesCSV,
  getPaymentsCSV,
} from "@/lib/actions/reports";
import { formatCurrency } from "@/lib/utils";

const MONTHS = [
  { value: "1", labelKey: "january" },
  { value: "2", labelKey: "february" },
  { value: "3", labelKey: "march" },
  { value: "4", labelKey: "april" },
  { value: "5", labelKey: "may" },
  { value: "6", labelKey: "june" },
  { value: "7", labelKey: "july" },
  { value: "8", labelKey: "august" },
  { value: "9", labelKey: "september" },
  { value: "10", labelKey: "october" },
  { value: "11", labelKey: "november" },
  { value: "12", labelKey: "december" },
];

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ReportGenerator() {
  const t = useTranslations("admin.reports");
  const tMonths = useTranslations("admin.reports.months");

  const currentDate = new Date();
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1));
  const [year, setYear] = useState(String(currentDate.getFullYear()));

  const [financialData, setFinancialData] = useState<Awaited<
    ReturnType<typeof getFinancialReportData>
  >["data"]>(null);
  const [maintenanceData, setMaintenanceData] = useState<Awaited<
    ReturnType<typeof getMaintenanceReportData>
  >["data"]>(null);

  const [isPendingFinancial, startFinancialTransition] = useTransition();
  const [isPendingMaintenance, startMaintenanceTransition] = useTransition();
  const [isPendingChargesCSV, startChargesCSVTransition] = useTransition();
  const [isPendingPaymentsCSV, startPaymentsCSVTransition] = useTransition();

  const currentYear = currentDate.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  function handleGenerateFinancial() {
    startFinancialTransition(async () => {
      const result = await getFinancialReportData(monthNum, yearNum);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (!result.data || result.data.charges.length === 0) {
        toast.info(t("noData"));
        setFinancialData(null);
        return;
      }
      setFinancialData(result.data);
      setMaintenanceData(null);
      toast.success(t("reportGenerated"));
    });
  }

  function handleGenerateMaintenance() {
    startMaintenanceTransition(async () => {
      const result = await getMaintenanceReportData(monthNum, yearNum);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (!result.data || result.data.totalRequests === 0) {
        toast.info(t("noData"));
        setMaintenanceData(null);
        return;
      }
      setMaintenanceData(result.data);
      setFinancialData(null);
      toast.success(t("reportGenerated"));
    });
  }

  function handleExportChargesCSV() {
    startChargesCSVTransition(async () => {
      const result = await getChargesCSV(monthNum, yearNum);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (!result.data) {
        toast.info(t("noData"));
        return;
      }
      downloadFile(
        result.data,
        `charges-${year}-${month.padStart(2, "0")}.csv`,
        "text/csv"
      );
      toast.success(t("exportSuccess"));
    });
  }

  function handleExportPaymentsCSV() {
    startPaymentsCSVTransition(async () => {
      const result = await getPaymentsCSV(monthNum, yearNum);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (!result.data) {
        toast.info(t("noData"));
        return;
      }
      downloadFile(
        result.data,
        `payments-${year}-${month.padStart(2, "0")}.csv`,
        "text/csv"
      );
      toast.success(t("exportSuccess"));
    });
  }

  function handlePrint() {
    window.print();
  }

  const monthLabel = tMonths(
    MONTHS.find((m) => m.value === month)?.labelKey || "january"
  );
  const periodLabel = `${monthLabel} ${year}`;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Card>
        <CardHeader>
          <CardTitle>{t("selectPeriod")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("selectMonth")}</label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {tMonths(m.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("selectYear")}</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Financial Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5" />
              {t("financialReport")}
            </CardTitle>
            <CardDescription>{t("financialDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleGenerateFinancial}
              disabled={isPendingFinancial}
              className="w-full"
            >
              {isPendingFinancial ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileBarChart className="mr-2 h-4 w-4" />
              )}
              {isPendingFinancial ? t("generating") : t("generateReport")}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportChargesCSV}
                disabled={isPendingChargesCSV}
                className="flex-1"
              >
                {isPendingChargesCSV ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {t("exportChargesCSV")}
              </Button>
              <Button
                variant="outline"
                onClick={handleExportPaymentsCSV}
                disabled={isPendingPaymentsCSV}
                className="flex-1"
              >
                {isPendingPaymentsCSV ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {t("exportPaymentsCSV")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {t("maintenanceReport")}
            </CardTitle>
            <CardDescription>{t("maintenanceDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleGenerateMaintenance}
              disabled={isPendingMaintenance}
              className="w-full"
            >
              {isPendingMaintenance ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wrench className="mr-2 h-4 w-4" />
              )}
              {isPendingMaintenance ? t("generating") : t("generateReport")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Financial Report Preview */}
      {financialData && (
        <div className="print-area space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {t("financialReport")} — {periodLabel}
            </h2>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="print:hidden"
            >
              <Printer className="mr-2 h-4 w-4" />
              {t("printReport")}
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("totalCharged")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(financialData.summary.totalCharged)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("totalCollected")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(financialData.summary.totalCollected)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("outstanding")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(financialData.summary.outstanding)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("collectionRate")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {financialData.summary.collectionRate}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>{t("byStatus")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {Object.entries(financialData.byStatus).map(
                  ([status, count]) => (
                    <div key={status} className="text-center">
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {status}
                      </p>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* By Category */}
          {Object.keys(financialData.byCategory).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("byCategory")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium">
                          {t("category")}
                        </th>
                        <th className="text-right py-2 pr-4 font-medium">
                          {t("chargeCount")}
                        </th>
                        <th className="text-right py-2 font-medium">
                          {t("totalAmount")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(financialData.byCategory).map(
                        ([cat, data]) => (
                          <tr key={cat} className="border-b">
                            <td className="py-2 pr-4 capitalize">{cat}</td>
                            <td className="py-2 pr-4 text-right">
                              {data.count}
                            </td>
                            <td className="py-2 text-right">
                              {formatCurrency(data.amount)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charges Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t("chargesDetail")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">
                        {t("apartment")}
                      </th>
                      <th className="text-left py-2 pr-4 font-medium">
                        {t("feeType")}
                      </th>
                      <th className="text-right py-2 pr-4 font-medium">
                        {t("charged")}
                      </th>
                      <th className="text-right py-2 pr-4 font-medium">
                        {t("paid")}
                      </th>
                      <th className="text-right py-2 pr-4 font-medium">
                        {t("balance")}
                      </th>
                      <th className="text-left py-2 font-medium">
                        {t("status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialData.charges.map((charge) => (
                      <tr key={charge.id} className="border-b">
                        <td className="py-2 pr-4">{charge.apartment}</td>
                        <td className="py-2 pr-4">{charge.feeType}</td>
                        <td className="py-2 pr-4 text-right">
                          {formatCurrency(charge.amount)}
                        </td>
                        <td className="py-2 pr-4 text-right text-green-600">
                          {formatCurrency(charge.paid)}
                        </td>
                        <td className="py-2 pr-4 text-right text-red-600">
                          {formatCurrency(charge.amount - charge.paid)}
                        </td>
                        <td className="py-2 capitalize">{charge.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Generation footer */}
          <p className="text-xs text-muted-foreground text-center">
            {t("generatedOn")} {new Date().toLocaleString()}
          </p>
        </div>
      )}

      {/* Maintenance Report Preview */}
      {maintenanceData && (
        <div className="print-area space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {t("maintenanceReport")} — {periodLabel}
            </h2>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="print:hidden"
            >
              <Printer className="mr-2 h-4 w-4" />
              {t("printReport")}
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("totalRequests")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {maintenanceData.totalRequests}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("avgResolution")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {maintenanceData.avgResolutionDays}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {t("days")}
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* By Status */}
          <Card>
            <CardHeader>
              <CardTitle>{t("byStatus")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                {Object.entries(maintenanceData.byStatus).map(
                  ([status, count]) => (
                    <div key={status} className="text-center">
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {status.replace("_", " ")}
                      </p>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* By Category */}
          <Card>
            <CardHeader>
              <CardTitle>{t("byCategory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                {Object.entries(maintenanceData.byCategory).map(
                  ([category, count]) => (
                    <div key={category} className="text-center">
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {category.replace("_", " ")}
                      </p>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* By Priority */}
          <Card>
            <CardHeader>
              <CardTitle>{t("byPriority")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                {Object.entries(maintenanceData.byPriority).map(
                  ([priority, count]) => (
                    <div key={priority} className="text-center">
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {priority}
                      </p>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Requests Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t("requestsDetail")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">
                        {t("reference")}
                      </th>
                      <th className="text-left py-2 pr-4 font-medium">
                        {t("requestTitle")}
                      </th>
                      <th className="text-left py-2 pr-4 font-medium">
                        {t("apartment")}
                      </th>
                      <th className="text-left py-2 pr-4 font-medium">
                        {t("category")}
                      </th>
                      <th className="text-left py-2 pr-4 font-medium">
                        {t("priority")}
                      </th>
                      <th className="text-left py-2 font-medium">
                        {t("status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceData.requests.map((req) => (
                      <tr key={req.id} className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">
                          {req.reference}
                        </td>
                        <td className="py-2 pr-4">{req.title}</td>
                        <td className="py-2 pr-4">{req.apartment}</td>
                        <td className="py-2 pr-4 capitalize">
                          {req.category.replace("_", " ")}
                        </td>
                        <td className="py-2 pr-4 capitalize">
                          {req.priority}
                        </td>
                        <td className="py-2 capitalize">
                          {req.status.replace("_", " ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Generation footer */}
          <p className="text-xs text-muted-foreground text-center">
            {t("generatedOn")} {new Date().toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
