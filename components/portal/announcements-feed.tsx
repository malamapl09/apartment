"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Announcement } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Megaphone } from "lucide-react";

interface AnnouncementsFeedProps {
  announcements: Announcement[];
}

export function AnnouncementsFeed({ announcements }: AnnouncementsFeedProps) {
  if (announcements.length === 0) {
    return (
      <div className="text-center py-12">
        <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No hay anuncios disponibles</p>
      </div>
    );
  }

  const getTargetLabel = (target: string) => {
    switch (target) {
      case "all":
        return "Todos";
      case "owners":
        return "Propietarios";
      case "residents":
        return "Residentes";
      default:
        return target;
    }
  };

  const getTargetVariant = (target: string) => {
    switch (target) {
      case "all":
        return "default";
      case "owners":
        return "secondary";
      case "residents":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <Card key={announcement.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Megaphone className="h-4 w-4 text-blue-600" />
                  <Badge variant={getTargetVariant(announcement.target) as any}>
                    {getTargetLabel(announcement.target)}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold">{announcement.title}</h3>
              </div>
              <time className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(announcement.published_at), "dd MMM yyyy", {
                  locale: es,
                })}
              </time>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {announcement.body}
            </p>
            {announcement.expires_at && (
              <p className="text-xs text-muted-foreground mt-4 italic">
                Válido hasta:{" "}
                {format(new Date(announcement.expires_at), "dd MMM yyyy", {
                  locale: es,
                })}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
