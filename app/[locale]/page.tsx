import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { checkBuildingsExist } from "@/lib/actions/setup";

export default async function RootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check if any buildings exist; if not, redirect to setup wizard
  const { exists } = await checkBuildingsExist();
  if (!exists) {
    redirect(`/${locale}/setup`);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not authenticated, redirect to login
  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Fetch user profile to check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect(`/${locale}/login`);
  }

  // Redirect based on role
  if (profile.role === "super_admin") {
    redirect(`/${locale}/super-admin`);
  }
  if (profile.role === "admin") {
    redirect(`/${locale}/admin`);
  }

  // Default redirect for owners and residents
  redirect(`/${locale}/portal`);
}
