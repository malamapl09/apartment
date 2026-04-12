"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { addBlacklistEntry } from "@/lib/actions/visitor-blacklist";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function VisitorBlacklistFormDialog() {
  const t = useTranslations("admin.visitors.blacklist");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");

  const reset = () => {
    setName("");
    setIdNumber("");
    setPhone("");
    setReason("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("form.nameRequired"));
      return;
    }
    if (!reason.trim()) {
      toast.error(t("form.reasonRequired"));
      return;
    }

    const formData = new FormData();
    formData.set("name", name);
    if (idNumber) formData.set("id_number", idNumber);
    if (phone) formData.set("phone", phone);
    formData.set("reason", reason);

    startTransition(async () => {
      const result = await addBlacklistEntry(formData);
      if ("success" in result && result.success) {
        toast.success(t("addSuccess"));
        setOpen(false);
        reset();
        router.refresh();
      } else if ("error" in result) {
        toast.error(result.error || t("addError"));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t("add")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 p-2">
          {t("form.nameOnlyWarning")}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bl_name">
              {t("form.nameLabel")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bl_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bl_id">{t("form.idNumberLabel")}</Label>
              <Input
                id="bl_id"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bl_phone">{t("form.phoneLabel")}</Label>
              <Input
                id="bl_phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bl_reason">
              {t("form.reasonLabel")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="bl_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
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
