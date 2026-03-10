import { getTranslations } from "next-intl/server";
import type { ComponentProps } from "react";
import {
  getFeeTypes,
  getCharges,
  getPayments,
  getFinancialSummary,
} from "@/lib/actions/admin-fees";
import { FinancialSummary } from "@/components/admin/financial-summary";
import { FeesDashboard } from "@/components/admin/fees-dashboard";
import { RealtimeRefreshWrapper } from "@/components/admin/realtime-refresh-wrapper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { ChargeWithDetails, FeeType } from "@/types";

type FeesDashboardPayments = ComponentProps<typeof FeesDashboard>["payments"];

export default async function AdminFeesPage() {
  const t = await getTranslations("admin.fees");

  const [
    { data: feeTypes, error: feeTypesError },
    { data: charges, error: chargesError },
    { data: payments, error: paymentsError },
    { data: summary, error: summaryError },
  ] = await Promise.all([
    getFeeTypes(),
    getCharges(),
    getPayments(),
    getFinancialSummary(),
  ]);

  const error = feeTypesError || chargesError || paymentsError || summaryError;

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <RealtimeRefreshWrapper watchPayments>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        {/* Financial Summary Cards */}
        {summary && <FinancialSummary summary={summary} />}

        {/* Main Interactive Dashboard */}
        <FeesDashboard
          feeTypes={(feeTypes || []) as FeeType[]}
          charges={(charges || []) as ChargeWithDetails[]}
          payments={(payments || []) as FeesDashboardPayments}
        />
      </div>
    </RealtimeRefreshWrapper>
  );
}
