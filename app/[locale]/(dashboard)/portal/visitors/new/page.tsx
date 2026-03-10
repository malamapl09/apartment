import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { VisitorRegisterForm } from "@/components/portal/visitor-register-form";

export default async function RegisterVisitorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal.visitors");

  return (
    <div className="container mx-auto max-w-2xl py-6 space-y-6">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href="/portal/visitors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("myVisitors")}
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("registerVisitor")}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <VisitorRegisterForm />
    </div>
  );
}
