"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createPoll } from "@/lib/actions/admin-polls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const pollFormSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(1000).optional(),
    poll_type: z.enum(["single_choice", "multiple_choice", "yes_no"]),
    target: z.enum(["all", "owners", "residents"]),
    ends_at: z.string().min(1, "End date is required").refine(
      (v) => new Date(v) > new Date(),
      { message: "End date must be in the future" }
    ),
    is_anonymous: z.boolean(),
    options: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (data.poll_type !== "yes_no") {
      const filled = data.options.filter((o) => o.trim() !== "");
      if (filled.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least 2 options are required",
          path: ["options"],
        });
      }
    }
  });

type PollFormValues = z.infer<typeof pollFormSchema>;

interface PollFormProps {
  onSuccess?: () => void;
}

export function PollForm({ onSuccess }: PollFormProps) {
  const t = useTranslations("admin.polls");
  const tCommon = useTranslations("labels");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<PollFormValues>({
    resolver: zodResolver(pollFormSchema),
    defaultValues: {
      title: "",
      description: "",
      poll_type: "single_choice",
      target: "all",
      ends_at: "",
      is_anonymous: false,
      options: ["", ""],
    },
  });

  const pollType = form.watch("poll_type");
  const options = form.watch("options");

  function addOption() {
    const current = form.getValues("options");
    form.setValue("options", [...current, ""], { shouldValidate: false });
  }

  function removeOption(index: number) {
    const current = form.getValues("options");
    if (current.length <= 2) return;
    form.setValue(
      "options",
      current.filter((_, i) => i !== index),
      { shouldValidate: false }
    );
  }

  function onSubmit(values: PollFormValues) {
    startTransition(async () => {
      const filteredOptions =
        values.poll_type === "yes_no"
          ? []
          : values.options.filter((o) => o.trim() !== "");

      const result = await createPoll({
        title: values.title,
        description: values.description || undefined,
        poll_type: values.poll_type,
        target: values.target,
        ends_at: new Date(values.ends_at).toISOString(),
        is_anonymous: values.is_anonymous,
        options: filteredOptions,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("createSuccess"));
        if (onSuccess) {
          onSuccess();
        } else {
          router.back();
        }
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("pollTitle")}</FormLabel>
              <FormControl>
                <Input placeholder={t("pollTitle")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("pollDescription")}{" "}
                <span className="text-muted-foreground font-normal text-xs">
                  {tCommon("optional")}
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("pollDescription")}
                  className="resize-none min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Type + Target in a 2-col grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="poll_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("pollType")}</FormLabel>
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
                    <SelectItem value="single_choice">
                      {t("singleChoice")}
                    </SelectItem>
                    <SelectItem value="multiple_choice">
                      {t("multipleChoice")}
                    </SelectItem>
                    <SelectItem value="yes_no">{t("yesNo")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="target"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("target")}</FormLabel>
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
                    <SelectItem value="all">{t("targetAll")}</SelectItem>
                    <SelectItem value="owners">{t("targetOwners")}</SelectItem>
                    <SelectItem value="residents">
                      {t("targetResidents")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* End date */}
        <FormField
          control={form.control}
          name="ends_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("endDate")}</FormLabel>
              <FormControl>
                <Input type="datetime-local" min={new Date().toISOString().slice(0, 16)} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Anonymous switch */}
        <FormField
          control={form.control}
          name="is_anonymous"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">{t("anonymous")}</FormLabel>
                <FormDescription>{t("anonymousDescription")}</FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label={t("anonymous")}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Dynamic options list – hidden for yes_no */}
        {pollType !== "yes_no" ? (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{t("options")}</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("addOption")}
                </Button>
              </div>

              {options.map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`options.${index}`}
                    render={({ field }) => (
                      <FormItem className="flex-1 mb-0">
                        <FormControl>
                          <Input
                            placeholder={`${t("option")} ${index + 1}`}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                      aria-label={t("removeOption")}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}

              {form.formState.errors.options?.root && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {form.formState.errors.options.root.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                {t("yesNoDescription")}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? t("creating") : t("createPoll")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
