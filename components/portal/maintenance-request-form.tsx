"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createMaintenanceRequest } from "@/lib/actions/maintenance";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaintenanceCategory, MaintenancePriority } from "@/types";

// Usage:
// <MaintenanceRequestForm locale="en" />

const categories: MaintenanceCategory[] = [
  "plumbing",
  "electrical",
  "hvac",
  "structural",
  "pest_control",
  "general",
];

const priorities: MaintenancePriority[] = ["low", "medium", "high", "urgent"];

interface MaintenanceRequestFormProps {
  locale: string;
}

export function MaintenanceRequestForm({ locale }: MaintenanceRequestFormProps) {
  const t = useTranslations("portal.maintenance");
  const tActions = useTranslations("actions");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MaintenanceCategory | "">("");
  const [priority, setPriority] = useState<MaintenancePriority | "">("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const supabaseRef = useRef(createClient());

  const uploadPhoto = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `requests/${fileName}`;

    const { error } = await supabaseRef.current.storage
      .from("maintenance-photos")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabaseRef.current.storage.from("maintenance-photos").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const MAX = 5;
    const remaining = MAX - photos.length;
    if (remaining === 0) {
      toast.error(t("maxPhotos", { max: MAX }));
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);

    const validFiles = toUpload.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(t("notImage", { name: file.name }));
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("fileTooLarge", { name: file.name }));
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      const urls = await Promise.all(validFiles.map(uploadPhoto));
      setPhotos((prev) => [...prev, ...urls]);
      toast.success(t("photosUploaded", { count: validFiles.length }));
    } catch {
      toast.error(t("photosUploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !priority) {
      toast.error(t("fillRequired"));
      return;
    }

    startTransition(async () => {
      const result = await createMaintenanceRequest({
        title,
        description,
        category: category as MaintenanceCategory,
        priority: priority as MaintenancePriority,
        photos,
      });

      if (result.error) {
        toast.error(result.error || t("submitError"));
      } else {
        toast.success(t("submitSuccess"));
        router.push(`/${locale}/portal/maintenance`);
      }
    });
  };

  const isLoading = isPending || uploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">{t("titleRequired")}</Label>
        <Input
          id="title"
          placeholder={t("requestTitlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">{t("descriptionRequired")}</Label>
        <Textarea
          id="description"
          placeholder={t("requestDescriptionPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={4}
          disabled={isLoading}
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">{t("categoryRequired")}</Label>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as MaintenanceCategory)}
          disabled={isLoading}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder={t("selectCategory")} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {t(`category.${c}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label htmlFor="priority">{t("priorityRequired")}</Label>
        <Select
          value={priority}
          onValueChange={(v) => setPriority(v as MaintenancePriority)}
          disabled={isLoading}
        >
          <SelectTrigger id="priority">
            <SelectValue placeholder={t("selectPriority")} />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((p) => (
              <SelectItem key={p} value={p}>
                {t(`priority.${p}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Photos */}
      <div className="space-y-3">
        <div>
          <Label>{t("photos")}</Label>
          <p className="text-xs text-muted-foreground mt-1">
            {t("photosDescription")}
          </p>
        </div>

        {photos.length < 5 && (
          <Card>
            <CardContent className="p-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-6 transition-colors",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50",
                  uploading && "opacity-50 pointer-events-none"
                )}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFiles(e.target.files)}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  {uploading ? (
                    <>
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">
                        {tActions("uploading")}
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        {t("dropImages")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {photos.length} {t("photoLimit")}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {photos.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {photos.map((url, i) => (
              <div
                key={url}
                className="relative group aspect-square rounded-md overflow-hidden border"
              >
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : null}
        {t("submitRequest")}
      </Button>
    </form>
  );
}
