import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPollResults } from "@/lib/actions/polls";
import { PollVoteForm } from "@/components/portal/poll-vote-form";
import { PollResultsDisplay } from "@/components/portal/poll-results-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { PollOption, PollVote, PollWithDetails } from "@/types";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function PortalPollDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal.polls");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  // Fetch poll with options and all votes
  const { data: rawPoll, error } = await supabase
    .from("polls")
    .select("*, poll_options (*), poll_votes (*)")
    .eq("id", id)
    .single();

  if (error || !rawPoll) notFound();

  // Determine if this user has voted
  const userVotes = (rawPoll.poll_votes || []).filter(
    (v: { user_id: string }) => v.user_id === user.id
  ) as PollVote[];
  const hasVoted = userVotes.length > 0;

  // Compose a typed PollWithDetails object
  const poll = rawPoll as unknown as PollWithDetails;

  // Show results if user voted or poll is closed
  const showResults = hasVoted || poll.status === "closed";

  // Fetch computed results for display
  let resultsData: { results: { id: string; label: string; vote_count: number; percentage: number }[]; totalVotes: number } | null = null;
  if (showResults) {
    const { data } = await getPollResults(id);
    resultsData = data ?? null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${locale}/portal/polls`} aria-label="Back to polls">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {poll.title}
            </h1>
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
          </div>
          {poll.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
              {poll.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {poll.status === "active"
              ? `${t("pollEnds")}: ${format(new Date(poll.ends_at), "PPp")}`
              : t("pollClosed")}
          </p>
        </div>
      </div>

      {/* Vote form or results */}
      {showResults && resultsData ? (
        <PollResultsDisplay
          results={resultsData.results}
          totalVotes={resultsData.totalVotes}
          pollTitle={poll.title}
        />
      ) : (
        <PollVoteForm
          poll={{
            ...poll,
            poll_options: rawPoll.poll_options as PollOption[],
            poll_votes: rawPoll.poll_votes as PollVote[],
            has_voted: hasVoted,
            user_votes: userVotes,
          }}
        />
      )}
    </div>
  );
}
