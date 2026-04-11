"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VisitorAccessCode } from "@/components/shared/visitor-access-code";
import { registerVisitor } from "@/lib/actions/visitors";
import { Link } from "@/i18n/navigation";

type Companion = { name: string; id_number: string; phone: string };

const MAX_COMPANIONS = 20;
const emptyCompanion = (): Companion => ({ name: "", id_number: "", phone: "" });

export function VisitorRegisterForm() {
  const t = useTranslations("portal.visitors");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<{
    access_code: string;
    companion_count: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    visitor_name: "",
    visitor_id_number: "",
    visitor_phone: "",
    vehicle_plate: "",
    vehicle_description: "",
    purpose: "",
    valid_from: "",
    valid_until: "",
    is_recurring: false,
    recurrence_pattern: "",
    recurrence_end_date: "",
    notes: "",
  });
  const [companions, setCompanions] = useState<Companion[]>([]);

  const updateCompanion = (
    index: number,
    field: keyof Companion,
    value: string,
  ) => {
    setCompanions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  };

  const addCompanion = () => {
    if (companions.length >= MAX_COMPANIONS) {
      toast.error(t("companions.maxReached", { max: MAX_COMPANIONS }));
      return;
    }
    setCompanions((prev) => [...prev, emptyCompanion()]);
  };

  const removeCompanion = (index: number) => {
    setCompanions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.visitor_name.trim()) return;
    if (!formData.valid_from || !formData.valid_until) return;
    if (new Date(formData.valid_from) >= new Date(formData.valid_until)) {
      toast.error(t("dateRangeError"));
      return;
    }

    const cleanedCompanions = companions
      .map((c) => ({
        name: c.name.trim(),
        id_number: c.id_number.trim() || undefined,
        phone: c.phone.trim() || undefined,
      }))
      .filter((c) => c.name.length > 0);

    setIsLoading(true);
    try {
      const result = await registerVisitor({
        visitor_name: formData.visitor_name,
        visitor_id_number: formData.visitor_id_number || undefined,
        visitor_phone: formData.visitor_phone || undefined,
        vehicle_plate: formData.vehicle_plate || undefined,
        vehicle_description: formData.vehicle_description || undefined,
        purpose: formData.purpose || undefined,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: new Date(formData.valid_until).toISOString(),
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.is_recurring
          ? formData.recurrence_pattern || undefined
          : undefined,
        recurrence_end_date: formData.is_recurring
          ? formData.recurrence_end_date || undefined
          : undefined,
        notes: formData.notes || undefined,
        companions: cleanedCompanions.length > 0 ? cleanedCompanions : undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setSuccessData({
        access_code: result.data?.access_code ?? "",
        companion_count: cleanedCompanions.length,
      });
    } catch {
      toast.error(t("registerError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (successData) {
    const totalGuests = 1 + successData.companion_count;
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("registerSuccess")}</CardTitle>
          <CardDescription>{t("shareCode")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <VisitorAccessCode code={successData.access_code} />
          {successData.companion_count > 0 && (
            <p className="text-sm text-center text-muted-foreground">
              {t("companions.sharedBy", { count: totalGuests })}
            </p>
          )}
          <div className="flex gap-3">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/portal/visitors">{t("myVisitors")}</Link>
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setSuccessData(null);
                setFormData({
                  visitor_name: "",
                  visitor_id_number: "",
                  visitor_phone: "",
                  vehicle_plate: "",
                  vehicle_description: "",
                  purpose: "",
                  valid_from: "",
                  valid_until: "",
                  is_recurring: false,
                  recurrence_pattern: "",
                  recurrence_end_date: "",
                  notes: "",
                });
                setCompanions([]);
              }}
            >
              {t("registerVisitor")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("registerVisitor")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Visitor Information */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="visitor_name">
                {t("visitorName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="visitor_name"
                name="visitor_name"
                placeholder={t("visitorNamePlaceholder")}
                value={formData.visitor_name}
                onChange={handleChange}
                required
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visitor_id_number">{t("visitorIdNumber")}</Label>
              <Input
                id="visitor_id_number"
                name="visitor_id_number"
                placeholder={t("visitorIdPlaceholder")}
                value={formData.visitor_id_number}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visitor_phone">{t("visitorPhone")}</Label>
              <Input
                id="visitor_phone"
                name="visitor_phone"
                type="tel"
                placeholder={t("visitorPhonePlaceholder")}
                value={formData.visitor_phone}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">{t("purpose")}</Label>
              <Input
                id="purpose"
                name="purpose"
                placeholder={t("purposePlaceholder")}
                value={formData.purpose}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vehicle_plate">{t("vehiclePlate")}</Label>
              <Input
                id="vehicle_plate"
                name="vehicle_plate"
                placeholder={t("vehiclePlatePlaceholder")}
                value={formData.vehicle_plate}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_description">
                {t("vehicleDescription")}
              </Label>
              <Input
                id="vehicle_description"
                name="vehicle_description"
                placeholder={t("vehicleDescriptionPlaceholder")}
                value={formData.vehicle_description}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Additional guests */}
          <div className="space-y-3 rounded-lg border p-4">
            <div>
              <h3 className="text-sm font-semibold">
                {t("companions.title")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("companions.description")}
              </p>
            </div>

            {companions.length > 0 && (
              <div className="space-y-3">
                {companions.map((companion, index) => (
                  <div
                    key={index}
                    className="rounded-md border p-3 space-y-3 bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        #{index + 2}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeCompanion(index)}
                        aria-label={t("companions.remove")}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1 sm:col-span-1">
                        <Label
                          htmlFor={`companion_name_${index}`}
                          className="text-xs"
                        >
                          {t("companions.nameLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`companion_name_${index}`}
                          value={companion.name}
                          onChange={(e) =>
                            updateCompanion(index, "name", e.target.value)
                          }
                          placeholder={t("visitorNamePlaceholder")}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`companion_id_${index}`}
                          className="text-xs"
                        >
                          {t("companions.idLabel")}
                        </Label>
                        <Input
                          id={`companion_id_${index}`}
                          value={companion.id_number}
                          onChange={(e) =>
                            updateCompanion(index, "id_number", e.target.value)
                          }
                          placeholder={t("visitorIdPlaceholder")}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`companion_phone_${index}`}
                          className="text-xs"
                        >
                          {t("companions.phoneLabel")}
                        </Label>
                        <Input
                          id={`companion_phone_${index}`}
                          type="tel"
                          value={companion.phone}
                          onChange={(e) =>
                            updateCompanion(index, "phone", e.target.value)
                          }
                          placeholder={t("visitorPhonePlaceholder")}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCompanion}
              disabled={companions.length >= MAX_COMPANIONS}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("companions.add")}
            </Button>
            {companions.length >= MAX_COMPANIONS && (
              <p className="text-xs text-muted-foreground">
                {t("companions.max", { max: MAX_COMPANIONS })}
              </p>
            )}
          </div>

          {/* Valid Period */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="valid_from">
                {t("validFrom")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="valid_from"
                name="valid_from"
                type="datetime-local"
                value={formData.valid_from}
                onChange={handleChange}
                required
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">
                {t("validUntil")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="valid_until"
                name="valid_until"
                type="datetime-local"
                value={formData.valid_until}
                onChange={handleChange}
                required
                aria-required="true"
              />
            </div>
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Switch
              id="is_recurring"
              checked={formData.is_recurring}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_recurring: checked }))
              }
              aria-label={t("isRecurring")}
            />
            <Label htmlFor="is_recurring" className="cursor-pointer">
              {t("isRecurring")}
            </Label>
          </div>

          {formData.is_recurring && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recurrence_pattern">
                  {t("recurrencePattern")}
                </Label>
                <Select
                  value={formData.recurrence_pattern}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      recurrence_pattern: value,
                    }))
                  }
                >
                  <SelectTrigger id="recurrence_pattern">
                    <SelectValue placeholder={t("recurrencePattern")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">
                      {t("recurrence.daily")}
                    </SelectItem>
                    <SelectItem value="weekly">
                      {t("recurrence.weekly")}
                    </SelectItem>
                    <SelectItem value="monthly">
                      {t("recurrence.monthly")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrence_end_date">
                  {t("recurrenceEndDate")}
                </Label>
                <Input
                  id="recurrence_end_date"
                  name="recurrence_end_date"
                  type="date"
                  value={formData.recurrence_end_date}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("notesLabel")}</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder={t("notesPlaceholder")}
              value={formData.notes}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("registerVisitor")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
