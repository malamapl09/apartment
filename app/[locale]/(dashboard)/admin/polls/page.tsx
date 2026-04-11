import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { getPolls } from "@/lib/actions/admin-polls";
import { PollTable } from "@/components/admin/poll-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, BarChart3, AlertCircle } from "lucide-react";
import { assertCurrentUserHasModule } from "@/lib/modules";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminPollsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await assertCurrentUserHasModule("polls");
  const t = await getTranslations("admin.polls");

  const { data: polls, error } = await getPolls();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/admin/polls/new`}>
            <Plus className="h-4 w-4 mr-2" />
            {t("createPoll")}
          </Link>
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats row */}
      {!error && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-2 rounded-full bg-gray-500/10">
                <BarChart3 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("draft")}</p>
                <p className="text-2xl font-bold">
                  {(polls || []).filter((p) => p.status === "draft").length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-2 rounded-full bg-green-500/10">
                <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("active")}</p>
                <p className="text-2xl font-bold">
                  {(polls || []).filter((p) => p.status === "active").length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-2 rounded-full bg-red-500/10">
                <BarChart3 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("closed")}</p>
                <p className="text-2xl font-bold">
                  {(polls || []).filter((p) => p.status === "closed").length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      {!error && (
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {(polls || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("noPollsYet")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  {t("noPollsDescription")}
                </p>
                <Button asChild>
                  <Link href={`/${locale}/admin/polls/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("createPoll")}
                  </Link>
                </Button>
              </div>
            ) : (
              <PollTable polls={polls || []} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
