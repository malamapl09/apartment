"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { recordPayment } from "@/lib/actions/admin-fees";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { ChargeWithDetails } from "@/types";
import { formatCurrency } from "@/lib/utils/currency";

const formSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payment_date: z.string().min(1, "Payment date is required"),
  payment_method: z
    .enum(["bank_transfer", "cash", "check", "other"])
    .optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RecordPaymentFormProps {
  charge: ChargeWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordPaymentForm({
  charge,
  open,
  onOpenChange,
}: RecordPaymentFormProps) {
  const t = useTranslations("admin.fees");
  const tActions = useTranslations("actions");
  const tErrors = useTranslations("errors");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const alreadyPaid = (charge.payments || []).reduce(
    (sum, p) => sum + p.amount,
    0
  );
  const remaining = Math.max(0, charge.amount - alreadyPaid);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: remaining,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "bank_transfer",
      reference_number: "",
      notes: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      const result = await recordPayment({
        charge_id: charge.id,
        amount: values.amount,
        payment_date: values.payment_date,
        payment_method: values.payment_method,
        reference_number: values.reference_number || undefined,
        notes: values.notes || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t("recordSuccess"));
      onOpenChange(false);
      form.reset();
    } catch {
      toast.error(tErrors("generic"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("recordPayment")}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1 mb-2">
          <p>
            <span className="text-muted-foreground">{t("apartmentLabel")}: </span>
            <span className="font-medium">
              {charge.apartments.unit_number}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">{t("feeLabel")}: </span>
            <span className="font-medium">{charge.fee_types.name}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{t("chargeAmountLabel")}: </span>
            <span className="font-medium">
              {formatCurrency(charge.amount)}
            </span>
          </p>
          {alreadyPaid > 0 && (
            <p>
              <span className="text-muted-foreground">{t("alreadyPaidLabel")}: </span>
              <span className="font-medium text-green-600">
                {formatCurrency(alreadyPaid)}
              </span>
            </p>
          )}
          <p>
            <span className="text-muted-foreground">{t("remainingLabel")}: </span>
            <span className="font-semibold">
              {formatCurrency(remaining)}
            </span>
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentAmount")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
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
              name="payment_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentDate")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("paymentMethod")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bank_transfer">
                        {t("paymentMethodOptions.bank_transfer")}
                      </SelectItem>
                      <SelectItem value="cash">
                        {t("paymentMethodOptions.cash")}
                      </SelectItem>
                      <SelectItem value="check">
                        {t("paymentMethodOptions.check")}
                      </SelectItem>
                      <SelectItem value="other">
                        {t("paymentMethodOptions.other")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("referenceNumber")}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. TXN-12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("notesOptional")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("notesPlaceholder")}
                      className="min-h-[70px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("recordPayment")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {tActions("cancel")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
