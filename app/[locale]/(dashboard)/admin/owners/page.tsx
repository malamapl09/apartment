import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getOwners } from "@/lib/actions/owners";
import { OwnerTable } from "@/components/admin/owner-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

export default async function OwnersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.owners");

  const { data: owners = [] } = await getOwners();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("description")}
          </p>
        </div>
        <Link href={`/${locale}/admin/owners/invite`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("inviteOwner")}
          </Button>
        </Link>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("searchPlaceholder")}
            className="pl-8"
          />
        </div>
      </div>

      <OwnerTable owners={owners} />
    </div>
  );
}
