import { getTranslations, setRequestLocale } from "next-intl/server";
import { getMyPayments } from "@/lib/actions/fees";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Receipt } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import { formatCurrency, formatMonth } from "@/lib/utils/currency";

type Payment = {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  charges: {
    amount: number;
    period_month: number;
    period_year: number;
    fee_types: { name: string; category: string } | null;
  } | null;
};

export default async function FeeHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal.fees");

  const { data: payments, error } = await getMyPayments();

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

  const typedPayments = (payments || []) as Payment[];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/portal/fees" aria-label="Back to fees">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("paymentHistory")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {typedPayments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
          <Receipt className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">
            {t("noPayments")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("noPaymentsDescription")}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {typedPayments.map((payment) => (
            <Card key={payment.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold">
                    {payment.charges?.fee_types?.name ?? "Payment"}
                  </CardTitle>
                  <span className="text-xl font-bold tabular-nums text-green-600 dark:text-green-400">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>
                    {format(new Date(payment.payment_date), "MMMM d, yyyy")}
                  </span>
                  {payment.charges && (
                    <span>
                      {formatMonth(payment.charges.period_month)}{" "}
                      {payment.charges.period_year}
                    </span>
                  )}
                  {payment.payment_method && (
                    <Badge variant="outline" className="capitalize text-xs">
                      {payment.payment_method.replace("_", " ")}
                    </Badge>
                  )}
                </div>

                {payment.reference_number && (
                  <p className="text-xs font-mono text-muted-foreground">
                    Ref: {payment.reference_number}
                  </p>
                )}

                {payment.notes && (
                  <p className="text-sm text-muted-foreground italic">
                    {payment.notes}
                  </p>
                )}

                {payment.charges && (
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <span className="text-xs text-muted-foreground">
                      Charge total:
                    </span>
                    <span className="text-xs font-medium">
                      {formatCurrency(payment.charges.amount)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
