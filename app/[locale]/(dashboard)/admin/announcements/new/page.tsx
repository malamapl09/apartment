import { setRequestLocale, getTranslations } from "next-intl/server";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function NewAnnouncementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.announcements");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo anuncio</h1>
        <p className="text-muted-foreground">
          Crea un anuncio para residentes y propietarios
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalles del anuncio</CardTitle>
          <CardDescription>
            Completa la información del anuncio que deseas publicar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnnouncementForm />
        </CardContent>
      </Card>
    </div>
  );
}
