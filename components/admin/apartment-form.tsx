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
import { createApartment, updateApartment } from "@/lib/actions/apartments";
import { Apartment } from "@/types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const apartmentFormSchema = z.object({
  unit_number: z.string().min(1, "Unit number is required"),
  floor: z.number().int().min(0, "Floor must be a positive number"),
  area_sqm: z.number().positive("Area must be positive"),
  bedrooms: z.number().int().min(0, "Bedrooms must be 0 or more"),
  bathrooms: z.number().int().min(0, "Bathrooms must be 0 or more"),
  status: z.enum(["vacant", "occupied", "maintenance"]),
});

type ApartmentFormValues = z.infer<typeof apartmentFormSchema>;

interface ApartmentFormProps {
  initialData?: Apartment;
  apartmentId?: string;
}

export function ApartmentForm({ initialData, apartmentId }: ApartmentFormProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [isLoading, setIsLoading] = useState(false);

  const isEditMode = !!initialData;

  const form = useForm<ApartmentFormValues>({
    resolver: zodResolver(apartmentFormSchema),
    defaultValues: initialData
      ? {
          unit_number: initialData.unit_number,
          floor: initialData.floor ?? 0,
          area_sqm: initialData.area_sqm ?? 0,
          bedrooms: initialData.bedrooms ?? 0,
          bathrooms: initialData.bathrooms ?? 0,
          status: initialData.status as "vacant" | "occupied" | "maintenance",
        }
      : {
          unit_number: "",
          floor: 0,
          area_sqm: 0,
          bedrooms: 0,
          bathrooms: 0,
          status: "vacant",
        },
  });

  async function onSubmit(data: ApartmentFormValues) {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("unit_number", data.unit_number);
      formData.append("floor", data.floor.toString());
      formData.append("area_sqm", data.area_sqm.toString());
      formData.append("bedrooms", data.bedrooms.toString());
      formData.append("bathrooms", data.bathrooms.toString());
      formData.append("status", data.status);

      if (isEditMode && apartmentId) {
        await updateApartment(apartmentId, formData);
        toast.success("Apartment updated successfully");
      } else {
        await createApartment(formData);
        toast.success("Apartment created successfully");
        router.push(`/${locale}/admin/apartments`);
      }
      router.refresh();
    } catch (error) {
      toast.error(
        isEditMode
          ? "Failed to update apartment"
          : "Failed to create apartment"
      );
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditMode ? "Edit Apartment" : "New Apartment"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="unit_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Number</FormLabel>
                    <FormControl>
                      <Input placeholder="101" {...field} />
                    </FormControl>
                    <FormDescription>
                      The apartment unit number (e.g., 101, 2A)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Floor number (0 for ground floor)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="area_sqm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area (m²)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="85.5" {...field} />
                    </FormControl>
                    <FormDescription>
                      Total area in square meters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bedrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrooms</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2" {...field} />
                    </FormControl>
                    <FormDescription>
                      Number of bedrooms
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bathrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bathrooms</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2" {...field} />
                    </FormControl>
                    <FormDescription>
                      Number of bathrooms
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="vacant">Vacant</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Current apartment status
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/${locale}/admin/apartments`)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Update" : "Create"} Apartment
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
