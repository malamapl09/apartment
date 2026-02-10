"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PublicSpace } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(
    initialData?.requires_approval ?? false
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set("requires_approval", requiresApproval.toString());

    try {
      const result = await onSubmit(formData);
      if (result.success) {
        toast.success(
          initialData ? "Space updated successfully" : "Space created successfully"
        );
        router.refresh();
      } else {
        toast.error(result.error || "An error occurred");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Space Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={initialData?.name}
              required
              placeholder="e.g., Community Room, Rooftop Terrace"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={initialData?.description || ""}
              rows={4}
              placeholder="Describe the space, amenities, and features..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (people) *</Label>
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
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate ($) *</Label>
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
              <Label htmlFor="deposit_amount">Deposit Amount ($)</Label>
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
          <CardTitle>Booking Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_advance_hours">
                Minimum Advance Hours *
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
                How far in advance must bookings be made
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_advance_days">Maximum Advance Days *</Label>
              <Input
                id="max_advance_days"
                name="max_advance_days"
                type="number"
                min="1"
                defaultValue={initialData?.max_advance_days ?? 30}
                required
              />
              <p className="text-sm text-muted-foreground">
                How far in advance can bookings be made
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_duration_hours">
                Maximum Duration (hours) *
              </Label>
              <Input
                id="max_duration_hours"
                name="max_duration_hours"
                type="number"
                min="1"
                defaultValue={initialData?.max_duration_hours ?? 4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_monthly_per_owner">
                Max Monthly Bookings per Owner *
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
              <Label htmlFor="gap_minutes">Gap Between Bookings (min) *</Label>
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
                Cleanup/setup time between bookings
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancellation_hours">
                Cancellation Window (hours) *
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
                Must cancel this many hours before booking
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet_hours_start">Quiet Hours Start</Label>
              <Input
                id="quiet_hours_start"
                name="quiet_hours_start"
                type="time"
                defaultValue={initialData?.quiet_hours_start || "22:00"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quiet_hours_end">Quiet Hours End</Label>
              <Input
                id="quiet_hours_end"
                name="quiet_hours_end"
                type="time"
                defaultValue={initialData?.quiet_hours_end || "08:00"}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Time range when noise should be minimized
          </p>
        </CardContent>
      </Card>

      {/* Approval Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="requires_approval">Requires Approval</Label>
              <p className="text-sm text-muted-foreground">
                Bookings must be approved by admin before confirmation
              </p>
            </div>
            <Switch
              id="requires_approval"
              checked={requiresApproval}
              onCheckedChange={setRequiresApproval}
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
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {initialData ? "Update Space" : "Create Space"}
        </Button>
      </div>
    </form>
  );
}
