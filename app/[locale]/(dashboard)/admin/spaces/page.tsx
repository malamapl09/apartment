import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSpaces } from "@/lib/actions/spaces";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import SpaceCard from "@/components/admin/space-card";

export default async function SpacesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.spaces");

  const { data: spaces = [] } = await getSpaces();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/admin/spaces/new`}>
            <Plus className="h-4 w-4 mr-2" />
            {t("newSpace")}
          </Link>
        </Button>
      </div>

      {spaces.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">{t("noSpaces")}</p>
          <Button asChild>
            <Link href={`/${locale}/admin/spaces/new`}>
              <Plus className="h-4 w-4 mr-2" />
              {t("createFirstSpace")}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space: any) => (
            <SpaceCard key={space.id} space={space} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
