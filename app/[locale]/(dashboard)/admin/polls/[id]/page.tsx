import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPollResults } from "@/lib/actions/admin-polls";
import { publishPoll, closePoll } from "@/lib/actions/admin-polls";
import { PollResults } from "@/components/admin/poll-results";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  Users,
  Eye,
  Lock,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { PollStatus } from "@/types";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

const statusClassName: Record<PollStatus, string> = {
  draft: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  active: "bg-green-500/10 text-green-700 dark:text-green-400",
  closed: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default async function AdminPollDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.polls");

  const { data: poll, error } = await getPollResults(id);

  if (error || !poll) {
    notFound();
  }

  async function handlePublish() {
    "use server";
    const result = await publishPoll(id);
    if (!result.error) {
      redirect(`/${locale}/admin/polls/${id}`);
    }
  }

  async function handleClose() {
    "use server";
    const result = await closePoll(id);
    if (!result.error) {
      redirect(`/${locale}/admin/polls/${id}`);
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${locale}/admin/polls`} aria-label="Back to polls">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {poll.title}
            </h1>
            <Badge
              variant="secondary"
              className={cn(statusClassName[poll.status as PollStatus])}
            >
              {t(poll.status)}
            </Badge>
          </div>
          {poll.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {poll.description}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content – bar chart results */}
        <div className="lg:col-span-2">
          <PollResults
            results={poll.results}
            totalVotes={poll.totalVotes}
            isAnonymous={poll.is_anonymous}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish action */}
          {poll.status === "draft" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("actions")}</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={handlePublish}>
                  <Button type="submit" className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    {t("publish")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Close action */}
          {poll.status === "active" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("actions")}</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={handleClose}>
                  <Button
                    type="submit"
                    variant="destructive"
                    className="w-full"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    {t("close")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Poll details */}
          <Card>
            <CardHeader>
              <CardTitle>{t("pollDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {/* End date */}
              <div className="flex items-start gap-3">
                <Calendar
                  className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-muted-foreground">{t("endDate")}</p>
                  <p>{format(new Date(poll.ends_at), "PPp")}</p>
                </div>
              </div>

              {/* Target audience */}
              <div className="flex items-start gap-3">
                <Users
                  className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-muted-foreground">{t("target")}</p>
                  <p>
                    {t(
                      poll.target === "all"
                        ? "targetAll"
                        : poll.target === "owners"
                          ? "targetOwners"
                          : "targetResidents"
                    )}
                  </p>
                </div>
              </div>

              {/* Poll type */}
              <div className="flex items-start gap-3">
                <Eye
                  className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("pollType")}
                  </p>
                  <p>
                    {t(
                      poll.poll_type === "single_choice"
                        ? "singleChoice"
                        : poll.poll_type === "multiple_choice"
                          ? "multipleChoice"
                          : "yesNo"
                    )}
                  </p>
                </div>
              </div>

              {/* Anonymous flag */}
              {poll.is_anonymous && (
                <div className="flex items-start gap-3">
                  <Lock
                    className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("anonymous")}
                    </p>
                    <p>{t("anonymousEnabled")}</p>
                  </div>
                </div>
              )}

              {/* Created by */}
              {poll.created_by_profile && (
                <div className="flex items-start gap-3">
                  <Users
                    className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("createdBy")}
                    </p>
                    <p className="font-medium">
                      {poll.created_by_profile.full_name}
                    </p>
                  </div>
                </div>
              )}

              {/* Created at */}
              <div className="flex items-start gap-3">
                <Calendar
                  className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("createdAt")}
                  </p>
                  <p>{format(new Date(poll.created_at), "PPp")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
