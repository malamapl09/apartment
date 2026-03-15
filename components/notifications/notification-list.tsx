"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Calendar, AlertCircle, MessageSquare, Info, Package, Wrench, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "@/lib/actions/notifications";
import { useRealtimeNotifications } from "@/lib/hooks/use-realtime-notifications";
import { useUser } from "@/lib/hooks/use-user";
import type { Notification } from "@/types";
import { formatDistanceToNow, type Locale } from "date-fns";
import { es } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";

interface NotificationData {
  action_url?: string;
}

// Map notification types to icons
const getNotificationIcon = (type: string) => {
  switch (type) {
    case "reservation_status":
      return Calendar;
    case "announcement":
      return Info;
    case "payment":
      return AlertCircle;
    case "comment":
      return MessageSquare;
    case "maintenance_update":
      return Wrench;
    case "package":
      return Package;
    case "visitor_checkin":
      return UserCheck;
    default:
      return Bell;
  }
};

const dateLocales: Record<string, Locale> = { es, en: enUS };

export function NotificationList() {
  const t = useTranslations("notifications");
  const currentLocale = useLocale();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { profile } = useUser();

  const handleNewNotification = useCallback(() => {
    loadNotifications();
    loadUnreadCount();
    toast.info(t("newNotification"));
  }, [t]);

  useRealtimeNotifications({
    userId: profile?.id ?? null,
    onNewNotification: handleNewNotification,
  });

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data = [] } = await getNotifications();
      setNotifications(data);
    } catch {
      // silently ignore — notifications are non-critical background data
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const { count = 0 } = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // silently ignore
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silently ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silently ignore
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">{t("title")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{t("title")}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-auto p-1 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              {t("markAll")}
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t("loading")}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">{t("empty")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("emptyDescription")}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
                  addSuffix: true,
                  locale: dateLocales[currentLocale] || enUS,
                });

                return (
                  <button
                    key={notification.id}
                    onClick={() => {
                      if (!notification.read_at) {
                        handleMarkAsRead(notification.id);
                      }
                      const url = (notification.data as NotificationData)?.action_url;
                      if (url) {
                        router.push(url);
                      }
                    }}
                    className={cn(
                      "w-full text-left p-4 hover:bg-muted/50 transition-colors",
                      !notification.read_at && "bg-blue-50/50 dark:bg-blue-950/20"
                    )}
                  >
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
                          !notification.read_at
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium line-clamp-1">
                            {notification.title}
                          </p>
                          {!notification.read_at && (
                            <div className="flex-shrink-0 h-2 w-2 bg-blue-600 rounded-full mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {notification.body}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {timeAgo}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
