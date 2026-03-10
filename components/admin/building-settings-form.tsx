"use client";

import { useTranslations } from "next-intl";
import { useTransition, useState } from "react";
import { updateBuildingSettings } from "@/lib/actions/building-settings";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { TIMEZONES } from "@/lib/constants";

interface BuildingSettingsFormProps {
  building: {
    id: string;
    name: string;
    address: string | null;
    total_units: number | null;
    bank_account_info: {
      bank_name: string;
      account_number: string;
      account_type: string;
      holder_name: string;
    } | null;
    payment_deadline_hours: number;
    timezone: string;
  };
}

export function BuildingSettingsForm({ building }: BuildingSettingsFormProps) {
  const t = useTranslations("admin.settings");
  const [isPending, startTransition] = useTransition();

  const [timezone, setTimezone] = useState(building.timezone);
  const [accountType, setAccountType] = useState(
    building.bank_account_info?.account_type ?? ""
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateBuildingSettings(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("saveSuccess"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* General Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("general.title")}</CardTitle>
          <CardDescription>{t("general.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("general.name")}</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={building.name}
              placeholder={t("general.namePlaceholder")}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t("general.address")}</Label>
            <Textarea
              id="address"
              name="address"
              defaultValue={building.address ?? ""}
              placeholder={t("general.addressPlaceholder")}
              maxLength={500}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="total_units">{t("general.totalUnits")}</Label>
              <Input
                id="total_units"
                name="total_units"
                type="number"
                required
                min={1}
                max={9999}
                defaultValue={building.total_units ?? 1}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_deadline_hours">
                {t("general.paymentDeadline")}
              </Label>
              <Input
                id="payment_deadline_hours"
                name="payment_deadline_hours"
                type="number"
                required
                min={1}
                max={720}
                defaultValue={building.payment_deadline_hours}
              />
              <p className="text-xs text-muted-foreground">
                {t("general.paymentDeadlineDescription")}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone-trigger">{t("general.timezone")}</Label>
            <input type="hidden" name="timezone" value={timezone} />
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone-trigger" className="w-full">
                <SelectValue placeholder={t("general.timezonePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bank Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("bank.title")}</CardTitle>
          <CardDescription>{t("bank.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bank_name">{t("bank.bankName")}</Label>
              <Input
                id="bank_name"
                name="bank_name"
                defaultValue={building.bank_account_info?.bank_name ?? ""}
                placeholder={t("bank.bankNamePlaceholder")}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">{t("bank.accountNumber")}</Label>
              <Input
                id="account_number"
                name="account_number"
                defaultValue={building.bank_account_info?.account_number ?? ""}
                placeholder={t("bank.accountNumberPlaceholder")}
                maxLength={100}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account-type-trigger">
                {t("bank.accountType")}
              </Label>
              <input type="hidden" name="account_type" value={accountType} />
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger id="account-type-trigger" className="w-full">
                  <SelectValue placeholder={t("bank.accountTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">
                    {t("bank.checking")}
                  </SelectItem>
                  <SelectItem value="savings">
                    {t("bank.savings")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="holder_name">{t("bank.holderName")}</Label>
              <Input
                id="holder_name"
                name="holder_name"
                defaultValue={building.bank_account_info?.holder_name ?? ""}
                placeholder={t("bank.holderNamePlaceholder")}
                maxLength={200}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="min-w-32">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? t("saving") : t("saveButton")}
        </Button>
      </div>
    </form>
  );
}
