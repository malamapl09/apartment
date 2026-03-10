"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { uploadDocument } from "@/lib/actions/documents";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(1000).optional(),
  category: z.enum(["rules", "minutes", "contracts", "notices", "forms"]),
  target: z.enum(["all", "owners", "residents"]),
});

type FormValues = z.infer<typeof formSchema>;

interface DocumentUploadFormProps {
  locale: string;
}

export function DocumentUploadForm({ locale }: DocumentUploadFormProps) {
  const t = useTranslations("admin.documents");
  const tActions = useTranslations("actions");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "notices",
      target: "all",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!selectedFile) {
      toast.error(t("errors.selectFile"));
      return;
    }

    try {
      setIsSubmitting(true);

      const supabase = createClient();
      const fileExt = selectedFile.name.split(".").pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from("documents")
        .upload(filePath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (storageError) {
        toast.error(`File upload failed: ${storageError.message}`);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("description", values.description ?? "");
      formData.append("category", values.category);
      formData.append("target", values.target);
      formData.append("file_url", publicUrlData.publicUrl);
      formData.append("file_name", selectedFile.name);
      formData.append("file_size", String(selectedFile.size));
      formData.append("mime_type", selectedFile.type);

      const result = await uploadDocument(formData);

      if (result.error) {
        // Clean up orphaned storage file
        await supabase.storage.from("documents").remove([filePath]);
        toast.error(result.error);
        return;
      }

      toast.success(t("uploadSuccess"));
      router.push(`/${locale}/admin/documents`);
      router.refresh();
    } catch {
      toast.error(t("errors.uploadFailed"));
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
              <FormLabel>{t("documentTitle")}</FormLabel>
              <FormControl>
                <Input placeholder={t("titlePlaceholder")} {...field} />
              </FormControl>
              <FormDescription>{t("titleHelp")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("documentDescription")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("descriptionPlaceholder")}
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("category")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="rules">{t("categories.rules")}</SelectItem>
                    <SelectItem value="minutes">{t("categories.minutes")}</SelectItem>
                    <SelectItem value="contracts">{t("categories.contracts")}</SelectItem>
                    <SelectItem value="notices">{t("categories.notices")}</SelectItem>
                    <SelectItem value="forms">{t("categories.forms")}</SelectItem>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">{t("targetAll")}</SelectItem>
                    <SelectItem value="owners">{t("targetOwners")}</SelectItem>
                    <SelectItem value="residents">{t("targetResidents")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormItem>
          <FormLabel>{t("file")}</FormLabel>
          <FormControl>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="cursor-pointer"
            />
          </FormControl>
          {selectedFile && (
            <p className="text-xs text-muted-foreground">
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
          {!selectedFile && (
            <FormDescription>
              {t("fileFormats")}
            </FormDescription>
          )}
        </FormItem>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? tActions("uploading") : t("upload")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            {tActions("cancel")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
