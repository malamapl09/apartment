"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateMonthlyCharges } from "@/lib/actions/admin-fees";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { FeeType } from "@/types";

const formSchema = z.object({
  fee_type_id: z.string().min(1, "Please select a fee type"),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
});

type FormValues = z.infer<typeof formSchema>;

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

interface GenerateChargesFormProps {
  feeTypes: FeeType[];
  onSuccess?: () => void;
}

export function GenerateChargesForm({ feeTypes, onSuccess }: GenerateChargesFormProps) {
  const t = useTranslations("admin.fees");
  const tActions = useTranslations("actions");
  const tErrors = useTranslations("errors");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);

  const currentDate = new Date();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fee_type_id: "",
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      setLastResult(null);

      const result = await generateMonthlyCharges(
        values.fee_type_id,
        values.month,
        values.year
      );

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setLastResult(result.count);
      toast.success(t("generateCount", { count: result.count }));
      onSuccess?.();
    } catch {
      toast.error(tErrors("generic"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fee_type_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("selectFeeType")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a fee type..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {feeTypes.map((ft) => (
                    <SelectItem key={ft.id} value={ft.id}>
                      {ft.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="month"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("selectMonth")}</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  defaultValue={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("selectYear")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="2020"
                    max="2100"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {lastResult !== null && (
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              {t("generateCount", { count: lastResult })}
              {lastResult === 0 && ` (${t("chargesMayExist")})`}
            </AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {tActions("generating")}
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              {t("generateCharges")}
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
