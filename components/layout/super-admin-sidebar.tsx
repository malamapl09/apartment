"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  LayoutDashboard,
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SuperAdminNavItem {
  titleKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const superAdminItems: SuperAdminNavItem[] = [
  { titleKey: "dashboard", href: "/super-admin", icon: LayoutDashboard },
  { titleKey: "buildings", href: "/super-admin/buildings", icon: Building2 },
];

interface SuperAdminSidebarProps {
  userRole?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

export function SuperAdminSidebar({
  isMobile = false,
  onClose,
}: SuperAdminSidebarProps) {
  const t = useTranslations("superAdmin.nav");
  const pathname = usePathname();
  const locale = useLocale();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    const cleanPath = pathname.replace(`/${locale}`, "") || "/";
    if (href === "/super-admin") {
      return cleanPath === href;
    }
    return cleanPath.startsWith(href);
  };

  const NavContent = () => (
    <div className="flex h-full flex-col">
      {/* Branding */}
      <div
        className={cn(
          "flex items-center border-b px-4 py-5",
          collapsed && !isMobile && "justify-center px-2"
        )}
      >
        <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
        {(!collapsed || isMobile) && (
          <div className="ml-3">
            <h1 className="text-xl font-bold leading-none">ResidenceHub</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Super Admin</p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {superAdminItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={`/${locale}${item.href}`}
                onClick={isMobile ? onClose : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  active
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                    : "text-muted-foreground",
                  collapsed && !isMobile && "justify-center px-2"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {(!collapsed || isMobile) && <span>{t(item.titleKey)}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Divider + My Building link */}
        <div className="mt-4 border-t pt-4">
          <Link
            href={`/${locale}/admin`}
            onClick={isMobile ? onClose : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
              collapsed && !isMobile && "justify-center px-2"
            )}
          >
            <ArrowLeftRight className="h-5 w-5 shrink-0" />
            {(!collapsed || isMobile) && <span>My Building</span>}
          </Link>
        </div>
      </ScrollArea>

      {!isMobile && (
        <div className="border-t p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("w-full", collapsed && "justify-center px-2")}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return <NavContent />;
  }

  return (
    <div
      className={cn(
        "h-full bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <NavContent />
    </div>
  );
}

export function SuperAdminMobileSidebar({
  userRole,
  trigger,
}: {
  userRole?: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="left" className="w-60 p-0">
        <SuperAdminSidebar
          userRole={userRole}
          isMobile
          onClose={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
