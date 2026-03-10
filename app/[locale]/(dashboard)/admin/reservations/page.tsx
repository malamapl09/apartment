import { Suspense } from "react";
import { getReservations } from "@/lib/actions/admin-reservations";
import { ReservationFilters } from "@/components/admin/reservation-filters";
import { ReservationTable } from "@/components/admin/reservation-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations, setRequestLocale } from "next-intl/server";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    space_id?: string;
    date_from?: string;
    date_to?: string;
  }>;
}

export default async function AdminReservationsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.reservations");

  const resolvedSearchParams = await searchParams;
  const filters = {
    status: resolvedSearchParams.status,
    space_id: resolvedSearchParams.space_id,
    date_from: resolvedSearchParams.date_from,
    date_to: resolvedSearchParams.date_to,
  };

  const { data: reservations, error } = await getReservations(filters);

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">{t("error")}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("filters.title")}</CardTitle>
          <CardDescription>{t("filters.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-20 w-full" />}>
            <ReservationFilters />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>
            {t("list.description", { count: reservations.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReservationTable reservations={reservations} />
        </CardContent>
      </Card>
    </div>
  );
}
