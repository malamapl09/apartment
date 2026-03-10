import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PollForm } from "@/components/admin/poll-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminNewPollPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.polls");

  async function handleSuccess() {
    "use server";
    redirect(`/${locale}/admin/polls`);
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${locale}/admin/polls`} aria-label={t("backToPolls")}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("createPoll")}
          </h1>
          <p className="text-muted-foreground">{t("createPollDescription")}</p>
        </div>
      </div>

      {/* Form card */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t("pollDetails")}</CardTitle>
          <CardDescription>{t("fillPollDetails")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PollForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}
