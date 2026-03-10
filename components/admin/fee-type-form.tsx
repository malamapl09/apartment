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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createFeeType, updateFeeType } from "@/lib/actions/admin-fees";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { FeeType } from "@/types";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  category: z.enum([
    "maintenance_fee",
    "common_area",
    "parking",
    "special_assessment",
    "other",
  ]),
  default_amount: z.number().min(0.01, "Amount must be greater than 0"),
  is_recurring: z.boolean(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FeeTypeFormProps {
  feeType?: FeeType;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FeeTypeForm({ feeType, onSuccess, onCancel }: FeeTypeFormProps) {
  const t = useTranslations("admin.fees");
  const tActions = useTranslations("actions");
  const tErrors = useTranslations("errors");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: feeType?.name ?? "",
      category: feeType?.category ?? "maintenance_fee",
      default_amount: feeType?.default_amount ?? 0,
      is_recurring: feeType?.is_recurring ?? false,
      description: feeType?.description ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      const result = feeType
        ? await updateFeeType(feeType.id, values)
        : await createFeeType(values);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(feeType ? t("feeTypeUpdated") : t("feeTypeCreated"));
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("feeTypeName")}</FormLabel>
              <FormControl>
                <Input placeholder={t("feeTypeNamePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("feeTypeCategory")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="maintenance_fee">
                    {t("feeCategory.maintenance_fee")}
                  </SelectItem>
                  <SelectItem value="common_area">
                    {t("feeCategory.common_area")}
                  </SelectItem>
                  <SelectItem value="parking">
                    {t("feeCategory.parking")}
                  </SelectItem>
                  <SelectItem value="special_assessment">
                    {t("feeCategory.special_assessment")}
                  </SelectItem>
                  <SelectItem value="other">{t("feeCategory.other")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="default_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("defaultAmount")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_recurring"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <FormLabel className="mb-0">{t("isRecurring")}</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("descriptionOptional")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("descriptionPlaceholder")}
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {feeType ? t("editFeeType") : t("newFeeType")}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {tActions("cancel")}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
