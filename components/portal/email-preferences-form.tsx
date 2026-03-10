"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { updateEmailPreferences } from "@/lib/actions/email-preferences";
import type { EmailPreferences } from "@/types";

interface EmailPreferencesFormProps {
  preferences: EmailPreferences;
}

const PREFERENCE_KEYS = [
  "new_charges",
  "maintenance_updates",
  "visitor_checkins",
  "new_announcements",
  "overdue_reminders",
] as const;

export default function EmailPreferencesForm({
  preferences,
}: EmailPreferencesFormProps) {
  const t = useTranslations("portal.emailPreferences");
  const [prefs, setPrefs] = useState<EmailPreferences>(preferences);
  const [isPending, startTransition] = useTransition();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const handleToggle = (key: (typeof PREFERENCE_KEYS)[number], checked: boolean) => {
    const updated = { ...prefs, [key]: checked };
    setPrefs(updated);
    setSavingKey(key);

    startTransition(async () => {
      const result = await updateEmailPreferences({ [key]: checked });
      if (result.error) {
        // Revert on error
        setPrefs((prev) => ({ ...prev, [key]: !checked }));
        toast.error(result.error);
      } else {
        toast.success(t("saved"));
      }
      setSavingKey(null);
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <div className="space-y-4">
        {PREFERENCE_KEYS.map((key) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="space-y-0.5">
              <Label htmlFor={key} className="text-sm font-medium">
                {t(`types.${key}.label`)}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t(`types.${key}.description`)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isPending && savingKey === key && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <Switch
                id={key}
                checked={prefs[key]}
                onCheckedChange={(checked) => handleToggle(key, checked)}
                disabled={isPending}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
