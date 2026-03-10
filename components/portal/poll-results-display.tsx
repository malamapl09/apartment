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

interface OptionResult {
  id: string;
  label: string;
  vote_count: number;
  percentage: number;
}

interface PollResultsDisplayProps {
  results: OptionResult[];
  totalVotes: number;
  pollTitle: string;
}

export function PollResultsDisplay({
  results,
  totalVotes,
  pollTitle,
}: PollResultsDisplayProps) {
  const t = useTranslations("portal.polls");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg">{pollTitle}</CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
            <Users className="h-3 w-3" aria-hidden="true" />
            <span>
              {totalVotes} {t("totalVotes")}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {results.map((option) => {
          const pct = Math.round(option.percentage);
          return (
            <div key={option.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{option.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {option.vote_count} ({pct}%)
                </span>
              </div>
              <div
                className="h-3 w-full rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={option.label}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${option.percentage}%` }}
                />
              </div>
            </div>
          );
        })}

        {totalVotes === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noVotesYet")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
