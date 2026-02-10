import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getApartment } from "@/lib/actions/apartments";
import { ApartmentForm } from "@/components/admin/apartment-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ApartmentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.apartments");

  const { data: apartment } = await getApartment(id);

  if (!apartment) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("editApartment")} - {apartment.unit_number}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("editApartmentDescription")}
        </p>
      </div>

      <ApartmentForm initialData={apartment} apartmentId={id} />

      {/* Linked Owners Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("linkedOwners")}</CardTitle>
        </CardHeader>
        <CardContent>
          {apartment.owners && apartment.owners.length > 0 ? (
            <div className="space-y-4">
              {apartment.owners.map((owner: any) => (
                <div
                  key={owner.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{owner.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {owner.email}
                    </p>
                    {owner.phone && (
                      <p className="text-sm text-muted-foreground">
                        {owner.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={owner.is_active ? "default" : "secondary"}>
                      {owner.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Link href={`/${locale}/admin/owners/${owner.id}`}>
                      <Button variant="outline" size="sm">
                        View Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("noOwnersLinked")}</p>
              <Link href={`/${locale}/admin/owners/invite`}>
                <Button variant="link" className="mt-2">
                  {t("inviteOwner")}
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
