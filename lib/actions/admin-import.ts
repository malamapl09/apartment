"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const rowSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  unit_number: z.string().min(1, "Unit number is required"),
  role: z.enum(["owner", "resident"]).default("owner"),
});

type CsvRow = z.infer<typeof rowSchema>;

export interface ImportRowResult {
  row: number;
  email: string;
  unit_number: string;
  success: boolean;
  error?: string;
}

export interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  results: ImportRowResult[];
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));

  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ""));

    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = values[i] ?? "";
    });
    return row;
  });
}

export async function bulkImportResidents(
  csvText: string
): Promise<{ error?: string; data?: ImportResult }> {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  // Parse CSV
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return { error: "No valid rows found in CSV" };
  }
  if (rows.length > 200) {
    return { error: "Maximum 200 rows per import" };
  }

  // Fetch building apartments for unit_number lookup
  const { data: apartments } = await adminClient
    .from("apartments")
    .select("id, unit_number")
    .eq("building_id", profile.building_id);

  const apartmentMap = new Map(
    (apartments ?? []).map((a) => [a.unit_number.toLowerCase(), a.id])
  );

  // Fetch existing emails to skip duplicates
  const { data: existingProfiles } = await adminClient
    .from("profiles")
    .select("email")
    .eq("building_id", profile.building_id);

  const existingEmails = new Set(
    (existingProfiles ?? []).map((p) => p.email.toLowerCase())
  );

  const results: ImportRowResult[] = [];
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    // Validate row
    const parsed = rowSchema.safeParse({
      full_name: raw.full_name || raw.name || "",
      email: raw.email || "",
      phone: raw.phone || raw.telephone || undefined,
      unit_number: raw.unit_number || raw.unit || raw.apartment || "",
      role: raw.role || "owner",
    });

    if (!parsed.success) {
      const msg = parsed.error.issues.map((e) => e.message).join(", ");
      results.push({
        row: rowNum,
        email: raw.email || "—",
        unit_number: raw.unit_number || raw.unit || raw.apartment || "—",
        success: false,
        error: msg,
      });
      failed++;
      continue;
    }

    const data: CsvRow = parsed.data;

    // Check duplicate email
    if (existingEmails.has(data.email.toLowerCase())) {
      results.push({
        row: rowNum,
        email: data.email,
        unit_number: data.unit_number,
        success: false,
        error: "Email already exists in this building",
      });
      failed++;
      continue;
    }

    // Find apartment
    const apartmentId = apartmentMap.get(data.unit_number.toLowerCase());
    if (!apartmentId) {
      results.push({
        row: rowNum,
        email: data.email,
        unit_number: data.unit_number,
        success: false,
        error: `Apartment "${data.unit_number}" not found`,
      });
      failed++;
      continue;
    }

    // Create auth user + invite
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.inviteUserByEmail(data.email, {
        data: {
          full_name: data.full_name,
          building_id: profile.building_id,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/set-password`,
      });

    if (createError || !newUser.user) {
      results.push({
        row: rowNum,
        email: data.email,
        unit_number: data.unit_number,
        success: false,
        error: createError?.message ?? "Failed to create user",
      });
      failed++;
      continue;
    }

    // Create profile
    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        id: newUser.user.id,
        building_id: profile.building_id,
        role: data.role,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
      });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      results.push({
        row: rowNum,
        email: data.email,
        unit_number: data.unit_number,
        success: false,
        error: profileError.message,
      });
      failed++;
      continue;
    }

    // Link to apartment
    const { error: linkError } = await adminClient
      .from("apartment_owners")
      .insert({
        apartment_id: apartmentId,
        profile_id: newUser.user.id,
        is_primary: true,
        move_in_date: new Date().toISOString().split("T")[0],
      });

    if (linkError) {
      await adminClient.from("profiles").delete().eq("id", newUser.user.id);
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      results.push({
        row: rowNum,
        email: data.email,
        unit_number: data.unit_number,
        success: false,
        error: linkError.message,
      });
      failed++;
      continue;
    }

    // Update apartment status
    await adminClient
      .from("apartments")
      .update({ status: "occupied" })
      .eq("id", apartmentId);

    // Track email to prevent duplicates within same import
    existingEmails.add(data.email.toLowerCase());

    results.push({
      row: rowNum,
      email: data.email,
      unit_number: data.unit_number,
      success: true,
    });
    successful++;
  }

  revalidatePath("/admin/owners");
  revalidatePath("/admin/apartments");

  return {
    data: {
      total: rows.length,
      successful,
      failed,
      results,
    },
  };
}
