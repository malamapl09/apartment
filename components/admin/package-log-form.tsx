"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { logPackage } from "@/lib/actions/admin-packages";

const formSchema = z.object({
  apartment_id: z.string().min(1, "Apartment is required"),
  tracking_number: z.string().optional(),
  carrier: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PackageLogFormProps {
  apartments: { id: string; unit_number: string }[];
}

export function PackageLogForm({ apartments }: PackageLogFormProps) {
  const t = useTranslations("admin.packages");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apartment_id: "",
      tracking_number: "",
      carrier: "",
      description: "",
      notes: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      const result = await logPackage({
        apartment_id: values.apartment_id,
        tracking_number: values.tracking_number || undefined,
        carrier: values.carrier || undefined,
        description: values.description,
        notes: values.notes || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t("logSuccess"));
      form.reset();
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(t("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("logPackage")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("logPackage")}</DialogTitle>
          <DialogDescription>{t("logPackageDescription")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="apartment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("apartment")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectApartment")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {apartments.map((apt) => (
                        <SelectItem key={apt.id} value={apt.id}>
                          {apt.unit_number}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("descriptionPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="carrier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("carrier")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("carrierPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tracking_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("trackingNumber")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("trackingNumberPlaceholder")}
                      {...field}
                    />
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
                  <FormLabel>{t("notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("notesPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? t("submitting") : t("logPackage")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
