"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface PollOptionResult {
  id: string;
  label: string;
  sort_order: number;
  vote_count: number;
  percentage: number;
  voters?: { user_id: string; full_name: string }[];
}

interface PollResultsProps {
  results: PollOptionResult[];
  totalVotes: number;
  isAnonymous: boolean;
}

export function PollResults({
  results,
  totalVotes,
  isAnonymous,
}: PollResultsProps) {
  const t = useTranslations("admin.polls");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("results")}</CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {t("totalVotes")}: {totalVotes}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {results.map((option) => (
          <div key={option.id} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{option.label}</span>
              <span className="text-muted-foreground">
                {option.vote_count} ({Math.round(option.percentage)}%)
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${option.percentage}%` }}
              />
            </div>
            {!isAnonymous &&
              option.voters &&
              option.voters.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {option.voters.map((voter) => (
                    <Badge
                      key={voter.user_id}
                      variant="outline"
                      className="text-xs"
                    >
                      {voter.full_name}
                    </Badge>
                  ))}
                </div>
              )}
          </div>
        ))}

        {totalVotes === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noVotesYet")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
