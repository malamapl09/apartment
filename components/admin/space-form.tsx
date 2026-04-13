"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PublicSpace, SpacePricingType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface SpaceFormProps {
  initialData?: PublicSpace;
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  locale: string;
}

export default function SpaceForm({
  initialData,
  onSubmit,
  locale,
}: SpaceFormProps) {
  const t = useTranslations("admin.spaces.form");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowReservations, setAllowReservations] = useState(
    initialData?.allow_reservations ?? true
  );
  const [pricingType, setPricingType] = useState<SpacePricingType>(
    initialData?.pricing_type ?? "hourly"
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set("allow_reservations", allowReservations.toString());
    formData.set("pricing_type", pricingType);

    try {
      const result = await onSubmit(formData);
      if (result.success) {
        toast.success(
          initialData ? t("updateSuccess") : t("createSuccess")
        );
        router.refresh();
      } else {
        toast.error(result.error || t("error"));
      }
    } catch (error) {
      toast.error(t("unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <Input
              id="name"
              name="name"
              defaultValue={initialData?.name}
              required
              placeholder={t("namePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("descriptionLabel")}</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={initialData?.description || ""}
              rows={4}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">{t("capacityLabel")}</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min="1"
              defaultValue={initialData?.capacity ?? undefined}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>{t("pricing")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pricing_type">{t("pricingTypeLabel")}</Label>
            <Select
              value={pricingType}
              onValueChange={(v) => setPricingType(v as SpacePricingType)}
            >
              <SelectTrigger id="pricing_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">
                  {t("pricingType.hourly")}
                </SelectItem>
                <SelectItem value="flat_rate">
                  {t("pricingType.flat_rate")}
                </SelectItem>
                <SelectItem value="per_day">
                  {t("pricingType.per_day")}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {t(`pricingTypeDescription.${pricingType}`)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">
                {t(`rateLabel.${pricingType}`)}
              </Label>
              <Input
                id="hourly_rate"
                name="hourly_rate"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initialData?.hourly_rate}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit_amount">{t("depositLabel")}</Label>
              <Input
                id="deposit_amount"
                name="deposit_amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initialData?.deposit_amount || 0}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Rules */}
      <Card>
        <CardHeader>
          <CardTitle>{t("bookingRules")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_advance_hours">
                {t("minAdvanceLabel")}
              </Label>
              <Input
                id="min_advance_hours"
                name="min_advance_hours"
                type="number"
                min="0"
                defaultValue={initialData?.min_advance_hours ?? 24}
                required
              />
              <p className="text-sm text-muted-foreground">
                {t("minAdvanceDescription")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_advance_days">{t("maxAdvanceLabel")}</Label>
              <Input
                id="max_advance_days"
                name="max_advance_days"
                type="number"
                min="1"
                defaultValue={initialData?.max_advance_days ?? 30}
                required
              />
              <p className="text-sm text-muted-foreground">
                {t("maxAdvanceDescription")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_duration_hours">
                {t("maxDurationLabel")}
              </Label>
              <Input
                id="max_duration_hours"
                name="max_duration_hours"
                type="number"
                min="1"
                defaultValue={initialData?.max_duration_hours ?? 4}
                required
              />
              {pricingType !== "hourly" && (
                <p className="text-sm text-muted-foreground">
                  {t("maxDurationHintNonHourly")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_monthly_per_owner">
                {t("maxMonthlyLabel")}
              </Label>
              <Input
                id="max_monthly_per_owner"
                name="max_monthly_per_owner"
                type="number"
                min="1"
                defaultValue={initialData?.max_monthly_per_owner ?? 4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gap_minutes">{t("gapMinutesLabel")}</Label>
              <Input
                id="gap_minutes"
                name="gap_minutes"
                type="number"
                min="0"
                step="15"
                defaultValue={initialData?.gap_minutes ?? 30}
                required
              />
              <p className="text-sm text-muted-foreground">
                {t("gapMinutesDescription")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancellation_hours">
                {t("cancellationLabel")}
              </Label>
              <Input
                id="cancellation_hours"
                name="cancellation_hours"
                type="number"
                min="0"
                defaultValue={initialData?.cancellation_hours ?? 24}
                required
              />
              <p className="text-sm text-muted-foreground">
                {t("cancellationDescription")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Limits */}
      <Card>
        <CardHeader>
          <CardTitle>{t("usageLimits.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("usageLimits.noLimitHint")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_hours_per_day_per_user">
                {t("usageLimits.maxHoursPerDayLabel")}
              </Label>
              <Input
                id="max_hours_per_day_per_user"
                name="max_hours_per_day_per_user"
                type="number"
                step="0.5"
                min="0"
                defaultValue={initialData?.max_hours_per_day_per_user ?? ""}
                placeholder={t("usageLimits.noLimitPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("usageLimits.maxHoursPerDayDescription")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_hours_per_week_per_user">
                {t("usageLimits.maxHoursPerWeekLabel")}
              </Label>
              <Input
                id="max_hours_per_week_per_user"
                name="max_hours_per_week_per_user"
                type="number"
                step="0.5"
                min="0"
                defaultValue={initialData?.max_hours_per_week_per_user ?? ""}
                placeholder={t("usageLimits.noLimitPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("usageLimits.maxHoursPerWeekDescription")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_hours_per_month_per_user">
                {t("usageLimits.maxHoursPerMonthLabel")}
              </Label>
              <Input
                id="max_hours_per_month_per_user"
                name="max_hours_per_month_per_user"
                type="number"
                step="0.5"
                min="0"
                defaultValue={initialData?.max_hours_per_month_per_user ?? ""}
                placeholder={t("usageLimits.noLimitPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("usageLimits.maxHoursPerMonthDescription")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reservationSettings")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow_reservations">{t("allowReservationsLabel")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("allowReservationsDescription")}
              </p>
            </div>
            <Switch
              id="allow_reservations"
              checked={allowReservations}
              onCheckedChange={setAllowReservations}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          {t("cancelButton")}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {initialData ? t("updateButton") : t("createButton")}
        </Button>
      </div>
    </form>
  );
}
