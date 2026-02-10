import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, DollarSign, ArrowRight, Image as ImageIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils/date";

export default async function SpacesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal.spaces");

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Fetch active spaces
  const { data: spaces } = await supabase
    .from("spaces")
    .select(`
      *,
      building:buildings (
        id,
        name,
        currency
      )
    `)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      {spaces && spaces.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {spaces.map((space) => (
            <Card key={space.id} className="flex flex-col overflow-hidden">
              {/* Photo Area */}
              <div className="aspect-video bg-muted relative">
                {space.photo_url ? (
                  <img
                    src={space.photo_url}
                    alt={space.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                {space.is_free && (
                  <Badge className="absolute top-2 right-2" variant="secondary">
                    {t("free")}
                  </Badge>
                )}
              </div>

              <CardHeader>
                <CardTitle>{space.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {space.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <div className="grid gap-2 text-sm">
                  {/* Capacity */}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {t("capacity")}: {space.capacity} {t("people")}
                    </span>
                  </div>

                  {/* Hourly Rate */}
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {space.is_free
                        ? t("free_of_charge")
                        : `${formatCurrency(space.hourly_rate, space.building?.currency || "USD")} ${t("per_hour")}`}
                    </span>
                  </div>

                  {/* Max Duration */}
                  {space.max_duration_hours && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {t("max_duration")}: {space.max_duration_hours}h
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/${locale}/portal/spaces/${space.id}`}>
                    {t("view_details")} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("no_spaces_available")}</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {t("no_spaces_description")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
