"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { createInfraction } from "@/lib/actions/infractions";
import type { InfractionSeverity, PublicSpace } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  profileId: string;
  spaces: Pick<PublicSpace, "id" | "name">[];
}

const ALL_SPACES = "__all__";
const SEVERITIES: InfractionSeverity[] = ["minor", "major", "severe"];

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function InfractionFormDialog({ profileId, spaces }: Props) {
  const t = useTranslations("admin.owners.infractions");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [spaceId, setSpaceId] = useState<string>(ALL_SPACES);
  const [severity, setSeverity] = useState<InfractionSeverity>("minor");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(() =>
    toLocalInputValue(new Date()),
  );
  const [alsoRestrict, setAlsoRestrict] = useState(false);
  const [restrictionEndsAt, setRestrictionEndsAt] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error(t("descriptionRequired"));
      return;
    }

    const formData = new FormData();
    formData.set("profile_id", profileId);
    if (spaceId !== ALL_SPACES) formData.set("space_id", spaceId);
    formData.set("severity", severity);
    formData.set("description", description);
    formData.set("occurred_at", new Date(occurredAt).toISOString());
    if (alsoRestrict) {
      formData.set("also_restrict", "true");
      if (restrictionEndsAt) {
        formData.set("restriction_ends_at", new Date(restrictionEndsAt).toISOString());
      }
    }

    startTransition(async () => {
      const result = await createInfraction(formData);
      if ("success" in result && result.success) {
        toast.success(t("addSuccess"));
        setOpen(false);
        setDescription("");
        setAlsoRestrict(false);
        setRestrictionEndsAt("");
        setSpaceId(ALL_SPACES);
        setSeverity("minor");
        router.refresh();
      } else if ("error" in result) {
        toast.error(result.error || t("addError"));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          {t("add")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="severity">{t("form.severityLabel")}</Label>
              <Select
                value={severity}
                onValueChange={(v) => setSeverity(v as InfractionSeverity)}
              >
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`severity.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="occurred_at">{t("form.occurredAtLabel")}</Label>
              <Input
                id="occurred_at"
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inf_space">{t("form.spaceLabel")}</Label>
            <Select value={spaceId} onValueChange={setSpaceId}>
              <SelectTrigger id="inf_space">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SPACES}>{t("form.noSpace")}</SelectItem>
                {spaces.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("form.descriptionLabel")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={alsoRestrict}
                onCheckedChange={(v) => setAlsoRestrict(v === true)}
              />
              <div>
                <div className="text-sm font-medium">
                  {t("form.alsoRestrict")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("form.alsoRestrictHint")}
                </div>
              </div>
            </label>

            {alsoRestrict && (
              <div className="space-y-2">
                <Label htmlFor="restriction_ends_at">
                  {t("form.restrictionEndsAtLabel")}
                </Label>
                <Input
                  id="restriction_ends_at"
                  type="datetime-local"
                  value={restrictionEndsAt}
                  onChange={(e) => setRestrictionEndsAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("form.indefiniteHint")}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("form.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
