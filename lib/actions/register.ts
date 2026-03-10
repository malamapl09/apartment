"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2).max(200),
  building_name: z.string().min(1).max(200),
  address: z.string().max(500).optional().default(""),
  total_units: z.coerce.number().int().min(1).max(9999),
  timezone: z.string().min(1),
});

export async function registerBuilding(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { email, password, full_name, building_name, address, total_units, timezone } = parsed.data;
  const adminClient = createAdminClient();

  // Step 1: Create auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    if (authError?.message?.toLowerCase().includes("already")) {
      return { error: "An account with this email already exists. Please log in instead." };
    }
    return { error: "Failed to create account. Please try again." };
  }

  const userId = authData.user.id;

  // Step 2: Create building
  const { data: building, error: buildingError } = await adminClient
    .from("buildings")
    .insert({
      name: building_name,
      address: address || null,
      total_units,
      timezone,
    })
    .select("id")
    .single();

  if (buildingError || !building) {
    await adminClient.auth.admin.deleteUser(userId);
    return { error: "Failed to create building" };
  }

  // Step 3: Create profile (admin role, not super_admin)
  const { error: profileError } = await adminClient
    .from("profiles")
    .insert({
      id: userId,
      building_id: building.id,
      role: "admin",
      full_name,
      email,
    });

  if (profileError) {
    await adminClient.from("buildings").delete().eq("id", building.id);
    await adminClient.auth.admin.deleteUser(userId);
    return { error: "Failed to create profile" };
  }

  // Step 4: Create email preferences (non-critical)
  const { error: emailPrefError } = await adminClient.from("email_preferences").insert({ user_id: userId });
  if (emailPrefError) {
    console.warn("Failed to create email preferences for user:", userId, emailPrefError.message);
  }

  // Step 5: Sign in the user
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    return { error: "Account created but sign-in failed. Please log in manually." };
  }

  return { success: true };
}
