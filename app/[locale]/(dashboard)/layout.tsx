import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAuthProfile } from "@/lib/actions/helpers";
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

  // Cached fetch — if any page or action in the same request also calls
  // getAuthProfile, they'll all share this single round-trip.
  const { user, profile } = await getAuthProfile();

  if (!user || !profile) {
    redirect(`/${locale}/login`);
  }

  const userInfo = {
    full_name: profile.full_name || user.email || "User",
    email: user.email || "",
    avatar_url: profile.avatar_url,
    role: profile.role,
  };
  const enabledModules = profile.enabled_modules;

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
