import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getApartments } from "@/lib/actions/apartments";
import { InviteOwnerForm } from "@/components/admin/invite-owner-form";

export default async function InviteOwnerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.owners");

  // Fetch available apartments
  const { data: apartments = [] } = await getApartments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("inviteOwner")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("inviteOwnerDescription")}
        </p>
      </div>

      <InviteOwnerForm apartments={apartments} />
    </div>
  );
}
