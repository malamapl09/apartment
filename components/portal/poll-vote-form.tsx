"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { castVote } from "@/lib/actions/polls";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";
import type { PollWithDetails, PollVote } from "@/types";

interface PollVoteFormProps {
  poll: PollWithDetails & { has_voted: boolean; user_votes?: PollVote[] };
}

export function PollVoteForm({ poll }: PollVoteFormProps) {
  const t = useTranslations("portal.polls");
  const router = useRouter();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const sortedOptions = [...(poll.poll_options || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  function handleSingleSelect(value: string) {
    setSelectedOptions([value]);
  }

  function handleMultipleSelect(optionId: string, checked: boolean) {
    if (checked) {
      setSelectedOptions((prev) => [...prev, optionId]);
    } else {
      setSelectedOptions((prev) => prev.filter((id) => id !== optionId));
    }
  }

  function handleSubmit() {
    if (selectedOptions.length === 0) return;

    startTransition(async () => {
      const result = await castVote(poll.id, selectedOptions);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("voteSuccess"));
        router.refresh();
      }
    });
  }

  // Already voted
  if (poll.has_voted) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>{t("alreadyVoted")}</AlertDescription>
      </Alert>
    );
  }

  // Poll closed
  if (poll.status === "closed") {
    return (
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>{t("pollClosed")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{poll.title}</CardTitle>
        {poll.description && (
          <CardDescription>{poll.description}</CardDescription>
        )}
        <p className="text-xs text-muted-foreground pt-1">
          {poll.poll_type === "multiple_choice"
            ? t("selectMultiple")
            : t("selectOne")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {(poll.poll_type === "single_choice" || poll.poll_type === "yes_no") && (
          <RadioGroup
            value={selectedOptions[0] || ""}
            onValueChange={handleSingleSelect}
            className="space-y-3"
          >
            {sortedOptions.map((option) => (
              <div
                key={option.id}
                className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent transition-colors cursor-pointer"
              >
                <RadioGroupItem value={option.id} id={option.id} />
                <Label
                  htmlFor={option.id}
                  className="flex-1 cursor-pointer font-normal"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {poll.poll_type === "multiple_choice" && (
          <div className="space-y-3" role="group" aria-label={t("selectMultiple")}>
            {sortedOptions.map((option) => (
              <div
                key={option.id}
                className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent transition-colors cursor-pointer"
              >
                <Checkbox
                  id={option.id}
                  checked={selectedOptions.includes(option.id)}
                  onCheckedChange={(checked) =>
                    handleMultipleSelect(option.id, checked === true)
                  }
                />
                <Label
                  htmlFor={option.id}
                  className="flex-1 cursor-pointer font-normal"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isPending || selectedOptions.length === 0}
          className="w-full"
        >
          {isPending ? t("submitting") : t("submitVote")}
        </Button>
      </CardContent>
    </Card>
  );
}
