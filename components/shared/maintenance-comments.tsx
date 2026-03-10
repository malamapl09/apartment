"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
  } | null;
}

interface MaintenanceCommentsProps {
  comments: Comment[];
  onAddComment: (body: string) => Promise<{ error?: string; success?: boolean }>;
  showInternal?: boolean;
  placeholder?: string;
  addCommentLabel?: string;
  successMessage?: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MaintenanceComments({
  comments,
  onAddComment,
  showInternal = false,
  placeholder,
  addCommentLabel,
  successMessage,
}: MaintenanceCommentsProps) {
  const t = useTranslations("portal.maintenance");
  const tAdmin = useTranslations("admin.maintenance");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const visibleComments = showInternal
    ? comments
    : comments.filter((c) => !c.is_internal);

  const handleSubmit = () => {
    if (!body.trim()) return;

    startTransition(async () => {
      const result = await onAddComment(body.trim());
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(successMessage ?? t("commentAdded"));
        setBody("");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Comment List */}
      {visibleComments.length > 0 ? (
        <div className="space-y-4">
          {visibleComments.map((comment, index) => (
            <div key={comment.id}>
              <div
                className={cn(
                  "flex gap-3",
                  comment.is_internal &&
                    "bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800"
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">
                    {comment.profiles?.full_name
                      ? getInitials(comment.profiles.full_name)
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium">
                      {comment.profiles?.full_name ?? "Unknown"}
                    </span>
                    {comment.is_internal && (
                      <Badge
                        variant="outline"
                        className="text-xs gap-1 border-amber-400 text-amber-700 dark:text-amber-400"
                      >
                        <Lock className="h-3 w-3" />
                        {tAdmin("internalNotes")}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), "PPp")}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                </div>
              </div>
              {index < visibleComments.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t("noComments")}
        </p>
      )}

      {/* Add Comment Form */}
      <Separator />
      <div className="space-y-3">
        <Textarea
          placeholder={placeholder ?? t("commentPlaceholder")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          disabled={isPending}
        />
        <Button
          onClick={handleSubmit}
          disabled={isPending || !body.trim()}
          size="sm"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {addCommentLabel ?? t("addComment")}
        </Button>
      </div>
    </div>
  );
}
