"use client";

import { Building2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-6">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">You&apos;re Offline</h1>
          <p className="text-muted-foreground">
            It looks like you&apos;ve lost your internet connection. Please
            check your connection and try again.
          </p>
        </div>
        <Button onClick={() => window.location.reload()} className="w-full">
          Try Again
        </Button>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>ResidenceHub</span>
        </div>
      </div>
    </div>
  );
}
