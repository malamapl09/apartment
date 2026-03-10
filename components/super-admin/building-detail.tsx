"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { updateBuilding } from "@/lib/actions/super-admin";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, X, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import type { Building, Profile } from "@/types";
import { TIMEZONES } from "@/lib/constants";

interface BuildingDetailProps {
  building: Building;
  profiles: Pick<
    Profile,
    "id" | "full_name" | "email" | "role" | "is_active" | "created_at"
  >[];
}

export function BuildingDetail({ building, profiles }: BuildingDetailProps) {
  const t = useTranslations("superAdmin.buildingDetail");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;

  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [timezone, setTimezone] = useState(building.timezone);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateBuilding(building.id, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("updateSuccess"));
        setIsEditing(false);
        router.refresh();
      }
    });
  }

  const roleVariant = (
    role: string
  ): "default" | "secondary" | "outline" | "destructive" => {
    if (role === "super_admin") return "destructive";
    if (role === "admin") return "default";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/${locale}/super-admin`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>

      {/* Section 1: Building Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("info")}</CardTitle>
              <CardDescription className="mt-1">
                {t("infoDescription")}
              </CardDescription>
            </div>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                {t("edit")}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setTimezone(building.timezone);
                }}
                disabled={isPending}
              >
                <X className="h-4 w-4 mr-2" />
                {t("cancel")}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!isEditing ? (
            /* Display mode */
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">{t("name")}</dt>
                <dd className="text-sm font-medium mt-1">{building.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t("totalUnits")}
                </dt>
                <dd className="text-sm font-medium mt-1">
                  {building.total_units ?? 0}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-muted-foreground">
                  {t("address")}
                </dt>
                <dd className="text-sm font-medium mt-1">
                  {building.address ?? (
                    <span className="text-muted-foreground italic">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t("timezone")}
                </dt>
                <dd className="text-sm font-medium mt-1">{building.timezone}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t("paymentDeadline")}
                </dt>
                <dd className="text-sm font-medium mt-1">
                  {building.payment_deadline_hours} {t("hours")}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t("createdAt")}
                </dt>
                <dd className="text-sm font-medium mt-1">
                  {format(new Date(building.created_at), "MMM d, yyyy")}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t("updatedAt")}
                </dt>
                <dd className="text-sm font-medium mt-1">
                  {format(new Date(building.updated_at), "MMM d, yyyy")}
                </dd>
              </div>
            </dl>
          ) : (
            /* Edit mode */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t("name")}</Label>
                <Input
                  id="edit-name"
                  name="name"
                  required
                  defaultValue={building.name}
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address">{t("address")}</Label>
                <Textarea
                  id="edit-address"
                  name="address"
                  defaultValue={building.address ?? ""}
                  maxLength={500}
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-total-units">{t("totalUnits")}</Label>
                  <Input
                    id="edit-total-units"
                    name="total_units"
                    type="number"
                    required
                    min={1}
                    max={9999}
                    defaultValue={building.total_units ?? 1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-timezone-trigger">{t("timezone")}</Label>
                  <input type="hidden" name="timezone" value={timezone} />
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger
                      id="edit-timezone-trigger"
                      className="w-full"
                    >
                      <SelectValue />
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

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setTimezone(building.timezone);
                  }}
                  disabled={isPending}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={isPending} className="min-w-32">
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isPending ? t("saving") : t("save")}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("users")}</CardTitle>
          <CardDescription>{t("usersDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("noUsers")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("userName")}</TableHead>
                  <TableHead>{t("userEmail")}</TableHead>
                  <TableHead>{t("userRole")}</TableHead>
                  <TableHead>{t("userStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      {profile.full_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {profile.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleVariant(profile.role)}>
                        {profile.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={profile.is_active ? "default" : "secondary"}
                      >
                        {profile.is_active ? t("active") : t("inactive")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
