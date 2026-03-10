"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inviteOwner } from "@/lib/actions/admin-users";
import { Apartment } from "@/types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface InviteOwnerFormProps {
  apartments: Apartment[];
}

export function InviteOwnerForm({ apartments }: InviteOwnerFormProps) {
  const t = useTranslations("admin.owners.inviteForm");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [isLoading, setIsLoading] = useState(false);

  const inviteOwnerSchema = z.object({
    full_name: z.string().min(2, t("validation.fullNameMin")),
    email: z.string().email(t("validation.emailInvalid")),
    phone: z.string().optional(),
    apartment_id: z.string().min(1, t("validation.apartmentRequired")),
  });

  type InviteOwnerFormValues = z.infer<typeof inviteOwnerSchema>;

  const form = useForm<InviteOwnerFormValues>({
    resolver: zodResolver(inviteOwnerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      apartment_id: "",
    },
  });

  async function onSubmit(data: InviteOwnerFormValues) {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("full_name", data.full_name);
      formData.append("email", data.email);
      if (data.phone) formData.append("phone", data.phone);
      formData.append("apartment_id", data.apartment_id);

      const result = await inviteOwner(formData);

      if (result.success) {
        toast.success(t("successToast"));
        router.push(`/${locale}/admin/owners`);
        router.refresh();
      } else {
        toast.error(result.error || t("errorToast"));
      }
    } catch (error) {
      toast.error(t("unexpectedError"));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fullNameLabel")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("fullNamePlaceholder")} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("fullNameDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("emailLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("emailDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("phoneLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+1234567890"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("phoneDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="apartment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("apartmentLabel")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("apartmentPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {apartments.map((apartment) => (
                        <SelectItem key={apartment.id} value={apartment.id}>
                          {t("unitFloor", { unit: apartment.unit_number, floor: apartment.floor ?? 0 })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t("apartmentDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/${locale}/admin/owners`)}
                disabled={isLoading}
              >
                {t("cancelButton")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("submitButton")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
