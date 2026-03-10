"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { publishPoll, closePoll } from "@/lib/actions/admin-polls";
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
import { BarChart3, Send, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { PollListItem, PollStatus, PollType } from "@/types";

interface PollTableProps {
  polls: PollListItem[];
}

const statusVariants: Record<
  PollStatus,
  { className: string; labelKey: string }
> = {
  draft: {
    className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    labelKey: "draft",
  },
  active: {
    className: "bg-green-500/10 text-green-700 dark:text-green-400",
    labelKey: "active",
  },
  closed: {
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
    labelKey: "closed",
  },
};

const typeKeyMap: Record<PollType, string> = {
  single_choice: "singleChoice",
  multiple_choice: "multipleChoice",
  yes_no: "yesNo",
};

const targetKeyMap: Record<string, string> = {
  all: "targetAll",
  owners: "targetOwners",
  residents: "targetResidents",
};

export function PollTable({ polls }: PollTableProps) {
  const t = useTranslations("admin.polls");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function handlePublish(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const result = await publishPoll(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("publishSuccess"));
        router.refresh();
      }
      setPendingId(null);
    });
  }

  function handleClose(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const result = await closePoll(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("closeSuccess"));
        router.refresh();
      }
      setPendingId(null);
    });
  }

  if (polls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t("table.empty")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.title")}</TableHead>
            <TableHead className="hidden sm:table-cell">
              {t("table.type")}
            </TableHead>
            <TableHead className="hidden md:table-cell">
              {t("table.target")}
            </TableHead>
            <TableHead>{t("table.status")}</TableHead>
            <TableHead className="hidden md:table-cell text-right">
              {t("table.votes")}
            </TableHead>
            <TableHead className="hidden lg:table-cell">
              {t("table.endsAt")}
            </TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {polls.map((poll) => {
            const voteCount = poll.poll_votes?.[0]?.count ?? 0;
            const status = poll.status as PollStatus;
            const pollType = poll.poll_type as PollType;
            const { className: statusClass, labelKey } =
              statusVariants[status] ?? statusVariants.draft;

            return (
              <TableRow key={poll.id}>
                <TableCell className="font-medium max-w-[180px] truncate">
                  {poll.title}
                </TableCell>

                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline">
                    {t(typeKeyMap[pollType] ?? "singleChoice")}
                  </Badge>
                </TableCell>

                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {t(targetKeyMap[poll.target] ?? "targetAll")}
                </TableCell>

                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(statusClass)}
                  >
                    {t(labelKey)}
                  </Badge>
                </TableCell>

                <TableCell className="hidden md:table-cell text-right tabular-nums">
                  {voteCount}
                </TableCell>

                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground whitespace-nowrap">
                  {format(new Date(poll.ends_at), "PP")}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pendingId === poll.id}
                        onClick={() => handlePublish(poll.id)}
                        aria-label={`${t("publish")} ${poll.title}`}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        {t("publish")}
                      </Button>
                    )}

                    {status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pendingId === poll.id}
                        onClick={() => handleClose(poll.id)}
                        aria-label={`${t("close")} ${poll.title}`}
                      >
                        <Lock className="h-3.5 w-3.5 mr-1" />
                        {t("close")}
                      </Button>
                    )}

                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/${locale}/admin/polls/${poll.id}`}>
                        <BarChart3 className="h-3.5 w-3.5 mr-1" />
                        {t("viewResults")}
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
