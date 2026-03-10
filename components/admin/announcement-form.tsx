"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { createAnnouncement } from "@/lib/actions/announcements";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format, type Locale } from "date-fns";
import { es } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";

const dateLocales: Record<string, Locale> = { es, en: enUS };

export function AnnouncementForm() {
  const t = useTranslations("admin.announcements.form");
  const router = useRouter();
  const currentLocale = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formSchema = z.object({
    title: z
      .string()
      .min(3, t("validation.titleMin"))
      .max(200, t("validation.titleMax")),
    body: z
      .string()
      .min(10, t("validation.bodyMin"))
      .max(2000, t("validation.bodyMax")),
    target: z.enum(["all", "owners", "residents"]),
    expires_at: z.date().optional(),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      body: "",
      target: "all",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("body", values.body);
      formData.append("target", values.target);
      if (values.expires_at) {
        formData.append("expires_at", values.expires_at.toISOString());
      }

      await createAnnouncement(formData);

      toast.success(t("successToast"));
      router.push("/admin/announcements");
      router.refresh();
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error(t("errorToast"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("titleLabel")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("titlePlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t("titleDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("bodyLabel")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("bodyPlaceholder")}
                  className="min-h-[150px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t("bodyDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="target"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("targetLabel")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("targetPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">{t("targetAll")}</SelectItem>
                  <SelectItem value="owners">{t("targetOwners")}</SelectItem>
                  <SelectItem value="residents">{t("targetResidents")}</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {t("targetDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expires_at"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("expiresAtLabel")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: dateLocales[currentLocale] || enUS })
                      ) : (
                        <span>{t("selectDate")}</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                {t("expiresAtDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            {t("cancel")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
