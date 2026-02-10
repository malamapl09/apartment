"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Building2,
  Users,
  MapPin,
  CalendarDays,
  Megaphone,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UserRole } from "@/types";

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  subItems?: { titleKey: string; href: string }[];
}

const adminItems: NavItem[] = [
  {
    titleKey: "dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    roles: ["super_admin", "admin"],
  },
  {
    titleKey: "apartments",
    href: "/admin/apartments",
    icon: Building2,
    roles: ["super_admin", "admin"],
  },
  {
    titleKey: "owners",
    href: "/admin/owners",
    icon: Users,
    roles: ["super_admin", "admin"],
  },
  {
    titleKey: "spaces",
    href: "/admin/spaces",
    icon: MapPin,
    roles: ["super_admin", "admin"],
  },
  {
    titleKey: "reservations",
    href: "/admin/reservations",
    icon: CalendarDays,
    roles: ["super_admin", "admin"],
    subItems: [
      { titleKey: "pendingPayments", href: "/admin/reservations/pending" },
    ],
  },
  {
    titleKey: "announcements",
    href: "/admin/announcements",
    icon: Megaphone,
    roles: ["super_admin", "admin"],
  },
];

const portalItems: NavItem[] = [
  {
    titleKey: "dashboard",
    href: "/portal",
    icon: LayoutDashboard,
    roles: ["owner", "resident"],
  },
  {
    titleKey: "spaces",
    href: "/portal/spaces",
    icon: MapPin,
    roles: ["owner", "resident"],
  },
  {
    titleKey: "reservations",
    href: "/portal/reservations",
    icon: CalendarDays,
    roles: ["owner", "resident"],
  },
  {
    titleKey: "profile",
    href: "/portal/profile",
    icon: User,
    roles: ["owner", "resident"],
  },
];

interface SidebarProps {
  userRole: string;
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ userRole, isMobile = false, onClose }: SidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isAdmin = userRole === "super_admin" || userRole === "admin";
  const navItems = isAdmin ? adminItems : portalItems;

  const isActive = (href: string) => {
    // Strip locale prefix for comparison
    const cleanPath = pathname.replace(/^\/(en|es)/, "") || "/";
    if (href === "/admin" || href === "/portal") {
      return cleanPath === href;
    }
    return cleanPath.startsWith(href);
  };

  const NavContent = () => (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex items-center border-b px-4 py-5",
          collapsed && !isMobile && "justify-center px-2"
        )}
      >
        <Building2 className="h-6 w-6 shrink-0 text-primary" />
        {(!collapsed || isMobile) && (
          <h1 className="ml-3 text-xl font-bold">ResidenceHub</h1>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
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

                {item.subItems && (!collapsed || isMobile) && active && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        onClick={isMobile ? onClose : undefined}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          isActive(subItem.href)
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        <Clock className="h-4 w-4" />
                        <span>{t(subItem.titleKey)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
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

export function MobileSidebar({
  userRole,
  trigger,
}: {
  userRole: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="left" className="w-60 p-0">
        <Sidebar userRole={userRole} isMobile onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
