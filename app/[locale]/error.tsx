"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const t = useTranslations();

  useEffect(() => {
    // Log error to error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>{t("error.title", { default: "Something went wrong!" })}</CardTitle>
          </div>
          <CardDescription>
            {t("error.description", {
              default:
                "An unexpected error occurred. Please try again or contact support if the problem persists.",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("error.details", { default: "Error Details" })}</AlertTitle>
            <AlertDescription className="mt-2 font-mono text-sm">
              {error.message || t("error.unknown", { default: "Unknown error occurred" })}
            </AlertDescription>
          </Alert>

          {error.digest && (
            <div className="rounded-lg border bg-muted p-3">
              <p className="text-xs text-muted-foreground">
                {t("error.errorId", { default: "Error ID" })}: {error.digest}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={reset} className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("error.retry", { default: "Try Again" })}
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <a href="/">
              {t("error.goHome", { default: "Go Home" })}
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
