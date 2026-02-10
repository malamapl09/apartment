"use client";

import { useState } from "react";
import { BlackoutDate } from "@/types";
import { addBlackout, removeBlackout } from "@/lib/actions/blackout-dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlackoutDatesManagerProps {
  spaceId: string;
  initialBlackouts: BlackoutDate[];
  locale: string;
}

export default function BlackoutDatesManager({
  spaceId,
  initialBlackouts,
  locale,
}: BlackoutDatesManagerProps) {
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>(initialBlackouts);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [reason, setReason] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddBlackout = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    setIsAdding(true);

    try {
      const result = await addBlackout(
        spaceId,
        format(selectedDate, "yyyy-MM-dd"),
        reason || undefined
      );

      if ('success' in result && result.success) {
        toast.success("Blackout date added successfully");
        setSelectedDate(undefined);
        setReason("");
        window.location.reload();
      } else if ('error' in result) {
        toast.error(result.error || "Failed to add blackout date");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveBlackout = async (id: string) => {
    setDeletingId(id);

    try {
      const result = await removeBlackout(id, spaceId);

      if ('success' in result && result.success) {
        setBlackouts((prev) => prev.filter((b) => b.id !== id));
        toast.success("Blackout date removed successfully");
      } else if ('error' in result) {
        toast.error(result.error || "Failed to remove blackout date");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setDeletingId(null);
    }
  };

  // Get already blacklisted dates for calendar
  const blackoutDates = blackouts.map((b) => new Date(b.date));

  return (
    <div className="space-y-6">
      {/* Add New Blackout */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) =>
                      date < new Date() ||
                      blackoutDates.some(
                        (bd) => bd.toDateString() === date.toDateString()
                      )
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Maintenance, Private Event"
              />
            </div>

            <Button
              onClick={handleAddBlackout}
              disabled={!selectedDate || isAdding}
              className="w-full"
            >
              {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Blackout Date
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Blackouts List */}
      <div className="space-y-3">
        <h3 className="font-semibold">Blackout Dates</h3>

        {blackouts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No blackout dates configured
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {blackouts
              .sort(
                (a, b) =>
                  new Date(a.date).getTime() -
                  new Date(b.date).getTime()
              )
              .map((blackout) => (
                <Card key={blackout.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">
                          {format(new Date(blackout.date), "PPP")}
                        </div>
                        {blackout.reason && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {blackout.reason}
                          </div>
                        )}
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === blackout.id}
                          >
                            {deletingId === blackout.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove Blackout Date?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will allow bookings on{" "}
                              {format(new Date(blackout.date), "PPP")}.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveBlackout(blackout.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
