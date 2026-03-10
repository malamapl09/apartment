import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { getActivePolls } from "@/lib/actions/polls";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  ArrowRight,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import type { PollWithDetails, PollVote } from "@/types";

interface PageProps {
  params: Promise<{ locale: string }>;
}

type EnrichedPoll = PollWithDetails & { has_voted: boolean; user_votes: PollVote[] };

export default async function PortalPollsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal.polls");

  const { data: polls, error } = await getActivePolls();

  const allPolls = (polls || []) as EnrichedPoll[];
  const activePolls = allPolls.filter((p) => p.status === "active");
  const closedPolls = allPolls.filter((p) => p.status === "closed");

  function PollCard({ poll }: { poll: EnrichedPoll }) {
    const voteCount = new Set((poll.poll_votes || []).map((v) => v.user_id))
      .size;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              {/* Badges */}
              <div className="flex items-start gap-2 flex-wrap">
                {poll.status === "active" ? (
                  <Badge
                    variant="secondary"
                    className="bg-green-500/10 text-green-700 dark:text-green-400"
                  >
                    {t("active")}
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-red-500/10 text-red-700 dark:text-red-400"
                  >
                    {t("closed")}
                  </Badge>
                )}
                {poll.has_voted && (
                  <Badge
                    variant="outline"
                    className="text-green-700 dark:text-green-400"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
                    {t("voted")}
                  </Badge>
                )}
              </div>

              {/* Title & description */}
              <h3 className="font-semibold leading-tight">{poll.title}</h3>
              {poll.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {poll.description}
                </p>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  {poll.status === "active"
                    ? `${t("pollEnds")}: ${format(new Date(poll.ends_at), "PP")}`
                    : t("pollClosed")}
                </span>
                <span className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" aria-hidden="true" />
                  {voteCount} {t("totalVotes")}
                </span>
              </div>
            </div>

            <Button
              asChild
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label={`View ${poll.title}`}
            >
              <Link href={`/${locale}/portal/polls/${poll.id}`}>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function EmptyState({ message }: { message: string }) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("noActivePolls")}</h3>
          <p className="text-sm text-muted-foreground max-w-md">{message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabbed lists */}
      {!error && (
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active">
              {t("active")}
              {activePolls.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activePolls.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="closed">{t("closed")}</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {activePolls.length > 0 ? (
              activePolls.map((poll) => (
                <PollCard key={poll.id} poll={poll} />
              ))
            ) : (
              <EmptyState message={t("noActivePollsDescription")} />
            )}
          </TabsContent>

          <TabsContent value="closed" className="space-y-3">
            {closedPolls.length > 0 ? (
              closedPolls.map((poll) => (
                <PollCard key={poll.id} poll={poll} />
              ))
            ) : (
              <EmptyState message={t("noClosedPollsDescription")} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
