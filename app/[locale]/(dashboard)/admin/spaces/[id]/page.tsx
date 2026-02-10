import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { getSpace, updateSpace, toggleSpaceActive } from "@/lib/actions/spaces";
import { getSchedule } from "@/lib/actions/schedules";
import { getBlackouts } from "@/lib/actions/blackout-dates";
import SpaceForm from "@/components/admin/space-form";
import AvailabilityEditor from "@/components/admin/availability-editor";
import BlackoutDatesManager from "@/components/admin/blackout-dates-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function SpaceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.spaces");

  const [spaceResult, scheduleResult, blackoutsResult] = await Promise.all([
    getSpace(id),
    getSchedule(id),
    getBlackouts(id),
  ]);

  const { data: space } = spaceResult;
  const { data: schedule } = scheduleResult;
  const { data: blackouts } = blackoutsResult;

  if (!space) {
    notFound();
  }

  const handleUpdate = async (formData: FormData): Promise<{ success: boolean; error?: string }> => {
    "use server";
    const result = await updateSpace(id, formData);
    if ('success' in result && result.success === true) {
      return { success: true };
    }
    return { success: false, error: 'error' in result ? result.error : 'Unknown error' };
  };

  const handleToggleActive = async () => {
    "use server";
    await toggleSpaceActive(id, !space.is_active);
    redirect(`/${locale}/admin/spaces/${id}`);
  };

  return (
    <div className="container mx-auto py-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/${locale}/admin/spaces`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{space.name}</h1>
            <p className="text-muted-foreground mt-1">
              {space.is_active ? t("activeSpace") : t("inactiveSpace")}
            </p>
          </div>
        </div>
        <form action={handleToggleActive}>
          <Button
            type="submit"
            variant={space.is_active ? "destructive" : "default"}
          >
            {space.is_active ? t("deactivate") : t("activate")}
          </Button>
        </form>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">{t("details")}</TabsTrigger>
          <TabsTrigger value="schedule">{t("schedule")}</TabsTrigger>
          <TabsTrigger value="blackouts">{t("blackouts")}</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("spaceDetails")}</CardTitle>
            </CardHeader>
            <CardContent>
              <SpaceForm
                initialData={space}
                onSubmit={handleUpdate}
                locale={locale}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("availability")}</CardTitle>
            </CardHeader>
            <CardContent>
              <AvailabilityEditor
                spaceId={id}
                initialSchedule={schedule || []}
                locale={locale}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blackouts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("blackoutDates")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BlackoutDatesManager
                spaceId={id}
                initialBlackouts={blackouts || []}
                locale={locale}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
