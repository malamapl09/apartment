"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const inviteOwnerSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2),
  phone: z.string().optional(),
  apartment_id: z.string().uuid(),
});

export async function inviteOwner(formData: FormData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Verify current user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  const result = inviteOwnerSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    phone: formData.get("phone") || undefined,
    apartment_id: formData.get("apartment_id"),
  });

  if (!result.success) {
    return { error: "Invalid data", details: result.error.flatten().fieldErrors };
  }

  const { email, full_name, phone, apartment_id } = result.data;

  // Create the user via admin client with invite
  const { data: newUser, error: createError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name,
      building_id: profile.building_id,
    },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/set-password`,
  });

  if (createError) {
    return { error: createError.message };
  }

  if (!newUser.user) {
    return { error: "Failed to create user" };
  }

  // Create profile
  const { error: profileError } = await adminClient
    .from("profiles")
    .insert({
      id: newUser.user.id,
      building_id: profile.building_id,
      role: "owner",
      full_name,
      email,
      phone: phone || null,
    });

  if (profileError) {
    return { error: profileError.message };
  }

  // Link to apartment
  const { error: linkError } = await adminClient
    .from("apartment_owners")
    .insert({
      apartment_id,
      profile_id: newUser.user.id,
      is_primary: true,
      move_in_date: new Date().toISOString().split("T")[0],
    });

  if (linkError) {
    return { error: linkError.message };
  }

  // Update apartment status to occupied
  await adminClient
    .from("apartments")
    .update({ status: "occupied" })
    .eq("id", apartment_id);

  return { success: true, userId: newUser.user.id };
}
