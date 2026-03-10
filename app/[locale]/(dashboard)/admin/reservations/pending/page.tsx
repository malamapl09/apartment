import { getPendingPayments } from "@/lib/actions/admin-reservations";
import { PaymentVerification } from "@/components/admin/payment-verification";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

const PER_PAGE = 25;

export default async function PendingPaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.reservations.pending");
  const page = Math.max(1, parseInt(resolvedSearchParams.page ?? "1", 10) || 1);

  const { data: pendingPayments, error, total } = await getPendingPayments({ page, per_page: PER_PAGE });

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Badge variant="secondary" className="gap-2">
          <Clock className="h-4 w-4" />
          {t("badge", { count: total })}
        </Badge>
      </div>

      {pendingPayments.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("empty.title")}</CardTitle>
            <CardDescription>{t("empty.description")}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingPayments.map((reservation) => (
            <PaymentVerification
              key={reservation.id}
              reservation={reservation}
            />
          ))}
          <PaginationControls total={total} page={page} perPage={PER_PAGE} />
        </div>
      )}
    </div>
  );
}
