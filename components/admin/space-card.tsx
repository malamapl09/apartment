"use client";

import Link from "next/link";
import { PublicSpace } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign } from "lucide-react";

interface SpaceCardProps {
  space: PublicSpace;
  locale: string;
}

export default function SpaceCard({ space, locale }: SpaceCardProps) {
  const hasPhotos = space.photos && space.photos.length > 0;
  const firstPhoto = hasPhotos ? space.photos[0] : null;

  return (
    <Link href={`/${locale}/admin/spaces/${space.id}`}>
      <Card className="overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer h-full">
        {/* Image Area */}
        <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
          {firstPhoto ? (
            <img
              src={firstPhoto}
              alt={space.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold opacity-50">
              {space.name.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            <Badge
              variant={space.is_active ? "default" : "secondary"}
              className={
                space.is_active
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-gray-500 hover:bg-gray-600"
              }
            >
              {space.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1">
            {space.name}
          </h3>

          {space.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {space.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{space.capacity} people</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>${space.hourly_rate}/hr</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
          {space.requires_approval && (
            <Badge variant="outline" className="text-xs">
              Requires Approval
            </Badge>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
