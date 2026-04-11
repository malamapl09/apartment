import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Fetch user profile + the building's enabled_modules so the sidebar can
  // hide modules the building has turned off.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role, building_id, buildings!building_id(enabled_modules)")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect(`/${locale}/login`);
  }

  const buildingsRel = (profile as { buildings?: unknown }).buildings;
  const buildingRow = Array.isArray(buildingsRel) ? buildingsRel[0] : buildingsRel;
  const enabledModules =
    (buildingRow as { enabled_modules?: string[] } | null)?.enabled_modules ?? [];

  const userInfo = {
    full_name: profile.full_name || user.email || "User",
    email: user.email || "",
    avatar_url: profile.avatar_url,
    role: profile.role,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r">
        <Sidebar userRole={profile.role} enabledModules={enabledModules} />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header user={userInfo} enabledModules={enabledModules} />
        <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
