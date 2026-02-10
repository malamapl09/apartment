import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createSpace } from "@/lib/actions/spaces";
import SpaceForm from "@/components/admin/space-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewSpacePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.spaces");

  const handleCreate = async (formData: FormData): Promise<{ success: boolean; error?: string }> => {
    "use server";
    const result = await createSpace(formData);
    if ('success' in result && result.success && result.data) {
      redirect(`/${locale}/admin/spaces/${result.data.id}`);
    }
    return { success: false, error: 'error' in result ? result.error : 'Unknown error' };
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("createNewSpace")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SpaceForm onSubmit={handleCreate} locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
