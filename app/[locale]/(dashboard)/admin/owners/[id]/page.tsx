import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getOwner } from "@/lib/actions/owners";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, MapPin, Calendar } from "lucide-react";

export default async function OwnerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.owners");

  const { data: owner } = await getOwner(id);

  if (!owner) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {owner.full_name || "Owner Profile"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("ownerDetailDescription")}
          </p>
        </div>
        <Badge variant={owner.is_active ? "default" : "secondary"} className="text-sm">
          {owner.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profileInformation")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-base">{owner.email}</p>
              </div>
            </div>

            {owner.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-base">{owner.phone}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Member Since
                </p>
                <p className="text-base">
                  {new Date(owner.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <p className="text-base capitalize">{owner.role}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Apartments */}
      <Card>
        <CardHeader>
          <CardTitle>{t("linkedApartments")}</CardTitle>
        </CardHeader>
        <CardContent>
          {owner.apartments && owner.apartments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {owner.apartments.map((apartment: any) => (
                <div
                  key={apartment.id}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">
                      Unit {apartment.unit_number}
                    </h3>
                    <Badge
                      variant={
                        apartment.status === "occupied"
                          ? "default"
                          : apartment.status === "vacant"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {apartment.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Floor: {apartment.floor}</p>
                    <p>Area: {apartment.area_sqm} m²</p>
                    <p>
                      {apartment.bedrooms} bed, {apartment.bathrooms} bath
                    </p>
                  </div>
                  <Link href={`/${locale}/admin/apartments/${apartment.id}`}>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      View Apartment
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("noApartmentsLinked")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reservation History */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reservationHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>{t("noReservationsYet")}</p>
            <p className="text-sm mt-2">
              Reservation history will appear here once the owner makes bookings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
