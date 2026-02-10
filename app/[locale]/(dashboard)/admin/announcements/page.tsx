import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAnnouncements, deleteAnnouncement } from "@/lib/actions/announcements";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DeleteAnnouncementButton } from "./delete-button";

export default async function AnnouncementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.announcements");

  const { data: announcements } = await getAnnouncements();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            Gestiona los anuncios para residentes y propietarios
          </p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/admin/announcements/new`}>
            <Plus className="mr-2 h-4 w-4" />
            {t("new")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            Todos los anuncios publicados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No hay anuncios publicados
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href={`/${locale}/admin/announcements/new`}>
                  Crear primer anuncio
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Audiencia</TableHead>
                  <TableHead>Publicado</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>Creado por</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => {
                  const targetLabel =
                    announcement.target === "all"
                      ? "Todos"
                      : announcement.target === "owners"
                      ? "Propietarios"
                      : "Residentes";

                  const targetVariant =
                    announcement.target === "all"
                      ? "default"
                      : announcement.target === "owners"
                      ? "secondary"
                      : "outline";

                  return (
                    <TableRow key={announcement.id}>
                      <TableCell className="font-medium">
                        {announcement.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant={targetVariant as any}>
                          {targetLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(
                          new Date(announcement.published_at),
                          "dd MMM yyyy",
                          { locale: es }
                        )}
                      </TableCell>
                      <TableCell>
                        {announcement.expires_at
                          ? format(
                              new Date(announcement.expires_at),
                              "dd MMM yyyy",
                              { locale: es }
                            )
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {(announcement as any).profiles?.full_name || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DeleteAnnouncementButton
                          announcementId={announcement.id}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
