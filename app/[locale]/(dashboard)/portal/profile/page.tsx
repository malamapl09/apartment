import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ProfileForm from "@/components/portal/profile-form";
import ChangePasswordForm from "@/components/portal/change-password-form";
import { User, Lock } from "lucide-react";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal.profile");

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Fetch user profile with apartment info
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      *,
      apartment_owners (
        apartment_id,
        apartments (
          apartment_number,
          building:buildings (
            id,
            name
          )
        )
      )
    `)
    .eq("id", user.id)
    .single();

  const apartments = profile?.apartment_owners?.map((ao: any) => ({
    number: ao.apartments?.apartment_number,
    building: ao.apartments?.building?.name,
  })) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      {/* Apartments Info */}
      {apartments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("my_apartments")}</CardTitle>
            <CardDescription>{t("apartments_description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {apartments.map((apt: any, index: number) => (
                <div key={index} className="p-3 rounded-lg border bg-muted/50">
                  <p className="font-semibold">
                    {apt.building} - {t("apartment")} {apt.number}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("personal_info")}
          </CardTitle>
          <CardDescription>{t("personal_info_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} locale={locale} />
        </CardContent>
      </Card>

      <Separator />

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t("change_password")}
          </CardTitle>
          <CardDescription>{t("change_password_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
