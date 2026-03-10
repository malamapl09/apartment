"use client";

import { useTranslations } from "next-intl";
import { useTransition, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createBuildingWithAdmin } from "@/lib/actions/super-admin";
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
import Link from "next/link";
import { TIMEZONES } from "@/lib/constants";

export function CreateBuildingForm() {
  const t = useTranslations("superAdmin.createBuilding");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const [isPending, startTransition] = useTransition();
  const [timezone, setTimezone] = useState("America/New_York");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createBuildingWithAdmin(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("success"));
        router.push(`/${locale}/super-admin`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Card 1: Building Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("buildingInfo")}</CardTitle>
          <CardDescription>{t("buildingInfoDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder={t("namePlaceholder")}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t("address")}</Label>
            <Textarea
              id="address"
              name="address"
              placeholder={t("addressPlaceholder")}
              maxLength={500}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="total_units">{t("totalUnits")}</Label>
              <Input
                id="total_units"
                name="total_units"
                type="number"
                required
                min={1}
                max={9999}
                defaultValue={1}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone-trigger">{t("timezone")}</Label>
              <input type="hidden" name="timezone" value={timezone} />
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone-trigger" className="w-full">
                  <SelectValue placeholder={t("timezonePlaceholder")} />
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
          </div>
        </CardContent>
      </Card>

      {/* Card 2: First Administrator */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminInfo")}</CardTitle>
          <CardDescription>{t("adminInfoDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin_email">{t("adminEmail")}</Label>
            <Input
              id="admin_email"
              name="admin_email"
              type="email"
              required
              placeholder={t("adminEmailPlaceholder")}
              maxLength={254}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_name">{t("adminName")}</Label>
            <Input
              id="admin_name"
              name="admin_name"
              required
              placeholder={t("adminNamePlaceholder")}
              maxLength={200}
              minLength={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href={`/${locale}/super-admin`}>{t("cancel")}</Link>
        </Button>
        <Button type="submit" disabled={isPending} className="min-w-36">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? t("submitting") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
