"use client";

import { useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { completeSetup } from "@/lib/actions/setup";
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
import { Building2, Loader2, User, Check } from "lucide-react";

// Usage:
// <SetupWizard />
// Renders a 3-step wizard: account details -> building details -> success screen.
// On completion, calls completeSetup() server action and redirects to super-admin.
// Translation keys live under the "setup" namespace in messages/*.json.

const TIMEZONES = [
  "America/Santo_Domingo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Bogota",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Buenos_Aires",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Asia/Tokyo",
] as const;

interface Step1Data {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

interface Step2Data {
  building_name: string;
  address: string;
  total_units: string;
  timezone: string;
}

interface FieldErrors {
  [key: string]: string;
}

// --- Step Indicator ---

interface StepIndicatorProps {
  currentStep: number;
  labels: [string, string, string];
}

function StepIndicator({ currentStep, labels }: StepIndicatorProps) {
  return (
    <nav aria-label="Setup progress" className="flex items-center justify-center mb-6">
      {[1, 2, 3].map((step, index) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={[
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                currentStep > step
                  ? "bg-green-500 text-white"
                  : currentStep === step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
              aria-label={`Step ${step}: ${labels[index]}`}
              aria-current={currentStep === step ? "step" : undefined}
            >
              {currentStep > step ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                step
              )}
            </div>
            <span
              className={[
                "mt-1.5 text-xs font-medium whitespace-nowrap",
                currentStep === step
                  ? "text-primary"
                  : currentStep > step
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground",
              ].join(" ")}
            >
              {labels[index]}
            </span>
          </div>

          {index < 2 && (
            <div
              className={[
                "mx-2 mb-5 h-px w-10 sm:w-14 transition-colors",
                currentStep > step + 1
                  ? "bg-green-500"
                  : currentStep > step
                  ? "bg-primary"
                  : "bg-muted",
              ].join(" ")}
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </nav>
  );
}

// --- Inline field error ---

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive mt-1" role="alert">
      {message}
    </p>
  );
}

// --- Main Wizard ---

export function SetupWizard() {
  const t = useTranslations("setup");
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) ?? "en";

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isPending, startTransition] = useTransition();

  const [step1Data, setStep1Data] = useState<Step1Data>({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const [step2Data, setStep2Data] = useState<Step2Data>({
    building_name: "",
    address: "",
    total_units: "1",
    timezone: "",
  });

  const [errors, setErrors] = useState<FieldErrors>({});

  // --- Validation ---

  function validateStep1(): boolean {
    const next: FieldErrors = {};

    if (step1Data.full_name.trim().length < 2) {
      next.full_name = t("validation.fullNameMin");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step1Data.email)) {
      next.email = t("validation.emailInvalid");
    }
    if (step1Data.password.length < 8) {
      next.password = t("validation.passwordMin");
    }
    if (step1Data.confirm_password !== step1Data.password) {
      next.confirm_password = t("validation.passwordMismatch");
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateStep2(): boolean {
    const next: FieldErrors = {};

    if (!step2Data.building_name.trim()) {
      next.building_name = t("validation.buildingNameRequired");
    }
    const units = parseInt(step2Data.total_units, 10);
    if (isNaN(units) || units < 1) {
      next.total_units = t("validation.totalUnitsMin");
    }
    if (!step2Data.timezone) {
      next.timezone = t("validation.timezoneRequired");
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // --- Handlers ---

  function handleStep1Next() {
    if (validateStep1()) {
      setErrors({});
      setCurrentStep(2);
    }
  }

  function handleStep2Submit() {
    if (!validateStep2()) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("full_name", step1Data.full_name.trim());
      formData.set("email", step1Data.email.trim());
      formData.set("password", step1Data.password);
      formData.set("confirm_password", step1Data.confirm_password);
      formData.set("building_name", step2Data.building_name.trim());
      formData.set("address", step2Data.address.trim());
      formData.set("total_units", step2Data.total_units);
      formData.set("timezone", step2Data.timezone);

      const result = await completeSetup(formData);

      if (result.error) {
        toast.error(result.error);
      } else {
        setCurrentStep(3);
      }
    });
  }

  function handleGoToAdmin() {
    router.push(`/${locale}/super-admin`);
  }

  // --- Render ---

  const stepLabels: [string, string, string] = [
    t("steps.account"),
    t("steps.building"),
    t("steps.complete"),
  ];

  return (
    <Card className="shadow-lg">
      {/* Branding */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Building2 className="h-7 w-7 text-primary" aria-hidden="true" />
          <span className="text-xl font-bold tracking-tight">ResidenceHub</span>
        </div>

        <StepIndicator currentStep={currentStep} labels={stepLabels} />

        {currentStep === 1 && (
          <>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" aria-hidden="true" />
              {t("account.title")}
            </CardTitle>
            <CardDescription>{t("account.description")}</CardDescription>
          </>
        )}
        {currentStep === 2 && (
          <>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" aria-hidden="true" />
              {t("building.title")}
            </CardTitle>
            <CardDescription>{t("building.description")}</CardDescription>
          </>
        )}
        {currentStep === 3 && (
          <>
            <CardTitle className="text-lg text-center">
              {t("complete.title")}
            </CardTitle>
            <CardDescription className="text-center">
              {t("complete.description")}
            </CardDescription>
          </>
        )}
      </CardHeader>

      <CardContent>
        {/* Step 1 — Account Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">{t("account.fullName")}</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                autoFocus
                placeholder={t("account.fullNamePlaceholder")}
                value={step1Data.full_name}
                onChange={(e) =>
                  setStep1Data((prev) => ({
                    ...prev,
                    full_name: e.target.value,
                  }))
                }
                aria-invalid={!!errors.full_name}
                aria-describedby={errors.full_name ? "full_name-error" : undefined}
              />
              <FieldError message={errors.full_name} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">{t("account.email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={t("account.emailPlaceholder")}
                value={step1Data.email}
                onChange={(e) =>
                  setStep1Data((prev) => ({ ...prev, email: e.target.value }))
                }
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              <FieldError message={errors.email} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t("account.password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder={t("account.passwordPlaceholder")}
                value={step1Data.password}
                onChange={(e) =>
                  setStep1Data((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              <FieldError message={errors.password} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">
                {t("account.confirmPassword")}
              </Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                placeholder={t("account.confirmPasswordPlaceholder")}
                value={step1Data.confirm_password}
                onChange={(e) =>
                  setStep1Data((prev) => ({
                    ...prev,
                    confirm_password: e.target.value,
                  }))
                }
                aria-invalid={!!errors.confirm_password}
                aria-describedby={
                  errors.confirm_password ? "confirm_password-error" : undefined
                }
              />
              <FieldError message={errors.confirm_password} />
            </div>

            <Button
              type="button"
              className="w-full mt-2"
              onClick={handleStep1Next}
            >
              {t("account.next")}
            </Button>
          </div>
        )}

        {/* Step 2 — Building Details */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="building_name">{t("building.name")}</Label>
              <Input
                id="building_name"
                name="building_name"
                type="text"
                autoFocus
                placeholder={t("building.namePlaceholder")}
                value={step2Data.building_name}
                onChange={(e) =>
                  setStep2Data((prev) => ({
                    ...prev,
                    building_name: e.target.value,
                  }))
                }
                aria-invalid={!!errors.building_name}
              />
              <FieldError message={errors.building_name} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">{t("building.address")}</Label>
              <Textarea
                id="address"
                name="address"
                placeholder={t("building.addressPlaceholder")}
                value={step2Data.address}
                onChange={(e) =>
                  setStep2Data((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
                className="min-h-[72px] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="total_units">{t("building.totalUnits")}</Label>
                <Input
                  id="total_units"
                  name="total_units"
                  type="number"
                  min={1}
                  max={9999}
                  value={step2Data.total_units}
                  onChange={(e) =>
                    setStep2Data((prev) => ({
                      ...prev,
                      total_units: e.target.value,
                    }))
                  }
                  aria-invalid={!!errors.total_units}
                />
                <FieldError message={errors.total_units} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="timezone-trigger">{t("building.timezone")}</Label>
                <Select
                  value={step2Data.timezone}
                  onValueChange={(val) =>
                    setStep2Data((prev) => ({ ...prev, timezone: val }))
                  }
                >
                  <SelectTrigger
                    id="timezone-trigger"
                    className="w-full"
                    aria-invalid={!!errors.timezone}
                  >
                    <SelectValue placeholder={t("building.timezonePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.timezone} />
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setErrors({});
                  setCurrentStep(1);
                }}
                disabled={isPending}
              >
                {t("building.back")}
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleStep2Submit}
                disabled={isPending}
              >
                {isPending && (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {isPending ? t("building.submitting") : t("building.submit")}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Success */}
        {currentStep === 3 && (
          <div className="flex flex-col items-center text-center gap-6 py-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
              aria-hidden="true"
            >
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={handleGoToAdmin}
            >
              {t("complete.goToDashboard")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
