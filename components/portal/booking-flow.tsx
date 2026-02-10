"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Calendar, Clock, DollarSign, CheckCircle, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { PublicSpace, AvailabilitySchedule, BlackoutDate } from "@/types";
import ReservationCalendar from "./reservation-calendar";
import TimeSlotPicker from "./time-slot-picker";
import { createReservation } from "@/lib/actions/reservations";
import { formatDate, formatCurrency } from "@/lib/utils/date";

interface BankInfo {
  account_name: string;
  account_number: string;
  bank_name: string;
  routing_number?: string;
}

interface BookingFlowProps {
  space: PublicSpace & {
    building?: {
      id: string;
      name: string;
      currency: string;
    };
  };
  schedules: AvailabilitySchedule[];
  blackouts: BlackoutDate[];
  bankInfo?: BankInfo;
}

type Step = "date" | "time" | "review";

export default function BookingFlow({
  space,
  schedules,
  blackouts,
  bankInfo,
}: BookingFlowProps) {
  const t = useTranslations("portal.booking");
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservationCode, setReservationCode] = useState("");

  // Get schedule for selected date
  const selectedSchedule = selectedDate
    ? schedules.find((s) => s.day_of_week === selectedDate.getDay())
    : undefined;

  // Calculate duration and cost
  const calculateCost = () => {
    if (!startTime || !endTime || space.hourly_rate === 0) return 0;

    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    const durationHours = durationMinutes / 60;

    return durationHours * space.hourly_rate;
  };

  const cost = calculateCost();
  const total = cost + (space.deposit_amount || 0);

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      // Reset time selection when date changes
      setStartTime("");
      setEndTime("");
    }
  };

  // Handle time selection
  const handleTimeSelect = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
    setStep("review");
  };

  // Handle reservation creation
  const handleCreateReservation = async () => {
    if (!selectedDate || !startTime || !endTime || !acceptedTerms) {
      toast.error(t("validation.complete_all_fields"));
      return;
    }

    setIsSubmitting(true);

    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const result = await createReservation({
        space_id: space.id,
        start_time: `${dateStr}T${startTime}:00`,
        end_time: `${dateStr}T${endTime}:00`,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.data) {
        setReservationCode(result.data.reference_code);
        toast.success(t("success.reservation_created"));
      }
    } catch (error) {
      console.error("Error creating reservation:", error);
      toast.error(t("error.unknown"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // If reservation created successfully, show success screen
  if (reservationCode) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">{t("success.title")}</CardTitle>
          <CardDescription>{t("success.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reference Code */}
          <div className="p-6 rounded-lg bg-primary/10 border-2 border-primary/20 text-center">
            <p className="text-sm text-muted-foreground mb-2">{t("reference_code")}</p>
            <p className="text-3xl font-bold font-mono">{reservationCode}</p>
          </div>

          {/* Reservation Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("space")}</span>
              <span className="font-medium">{space.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("date")}</span>
              <span className="font-medium">{selectedDate && formatDate(selectedDate.toISOString(), locale)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("time")}</span>
              <span className="font-medium">{startTime} - {endTime}</span>
            </div>
          </div>

          {/* Payment Instructions */}
          {space.hourly_rate > 0 && bankInfo && (
            <>
              <Separator />
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">{t("payment_instructions.title")}</p>
                  <p className="text-sm mb-4">{t("payment_instructions.description")}</p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">{t("payment_instructions.bank")}:</span> {bankInfo.bank_name}
                    </div>
                    <div>
                      <span className="font-medium">{t("payment_instructions.account_name")}:</span> {bankInfo.account_name}
                    </div>
                    <div>
                      <span className="font-medium">{t("payment_instructions.account_number")}:</span> {bankInfo.account_number}
                    </div>
                    {bankInfo.routing_number && (
                      <div>
                        <span className="font-medium">{t("payment_instructions.routing")}:</span> {bankInfo.routing_number}
                      </div>
                    )}
                    <div className="mt-3 p-3 bg-primary/10 rounded">
                      <span className="font-medium">{t("amount_to_transfer")}:</span>{" "}
                      <span className="text-lg font-bold">{formatCurrency(total, space.building?.currency || "USD")}</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push(`/${locale}/portal/reservations`)}
            >
              {t("view_my_reservations")}
            </Button>
            <Button
              className="flex-1"
              onClick={() => router.push(`/${locale}/portal/spaces`)}
            >
              {t("make_another_reservation")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        <div className={`flex items-center gap-2 ${step === "date" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "date" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            1
          </div>
          <span className="hidden sm:inline">{t("steps.date")}</span>
        </div>
        <div className="w-12 h-px bg-border" />
        <div className={`flex items-center gap-2 ${step === "time" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "time" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            2
          </div>
          <span className="hidden sm:inline">{t("steps.time")}</span>
        </div>
        <div className="w-12 h-px bg-border" />
        <div className={`flex items-center gap-2 ${step === "review" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "review" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            3
          </div>
          <span className="hidden sm:inline">{t("steps.review")}</span>
        </div>
      </div>

      {/* Step Content */}
      {step === "date" && (
        <div className="space-y-4">
          <ReservationCalendar
            spaceId={space.id}
            schedules={schedules}
            blackouts={blackouts}
            onDateSelect={handleDateSelect}
            initialDate={selectedDate}
          />
          {selectedDate && selectedSchedule && (
            <div className="flex justify-end">
              <Button onClick={() => setStep("time")} size="lg">
                {t("next")} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {step === "time" && selectedDate && selectedSchedule && (
        <div className="space-y-4">
          <TimeSlotPicker
            schedule={selectedSchedule}
            reservations={[]} // Will be fetched by useRealtimeAvailability in the component
            gapMinutes={space.gap_minutes}
            maxDurationHours={space.max_duration_hours}
            onSelect={handleTimeSelect}
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("date")}>
              <ArrowLeft className="mr-2 h-5 w-5" /> {t("back")}
            </Button>
          </div>
        </div>
      )}

      {step === "review" && selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>{t("review.title")}</CardTitle>
            <CardDescription>{t("review.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Reservation Details */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">{t("space")}</p>
                  <p className="font-semibold">{space.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">{t("date")}</p>
                  <p className="font-semibold">{formatDate(selectedDate.toISOString(), locale)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">{t("time")}</p>
                  <p className="font-semibold">{startTime} - {endTime}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Cost Breakdown */}
            {space.hourly_rate > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <DollarSign className="h-5 w-5" />
                  {t("cost_breakdown")}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("hourly_rate")}</span>
                    <span className="text-sm font-medium">{formatCurrency(cost, space.building?.currency || "USD")}</span>
                  </div>

                  {space.deposit_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("deposit")}</span>
                      <span className="text-sm font-medium">{formatCurrency(space.deposit_amount, space.building?.currency || "USD")}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>{t("total")}</span>
                    <span>{formatCurrency(total, space.building?.currency || "USD")}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Terms Acceptance */}
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
              />
              <div className="flex-1">
                <Label htmlFor="terms" className="cursor-pointer">
                  {t("terms.accept")}
                </Label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("time")}
                disabled={isSubmitting}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-5 w-5" /> {t("back")}
              </Button>
              <Button
                onClick={handleCreateReservation}
                disabled={!acceptedTerms || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? t("creating") : t("confirm_reservation")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
