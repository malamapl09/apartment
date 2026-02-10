"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Link } from "@/i18n/navigation";
import { setPassword } from "@/lib/actions/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

function setPasswordAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  return setPassword(formData);
}

export default function SetPasswordPage() {
  const t = useTranslations("auth.setPassword");
  const tLogin = useTranslations("auth.login");
  const [state, formAction, isPending] = useActionState(
    setPasswordAction,
    null
  );
  const [clientError, setClientError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setClientError(null);

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password.length < 8) {
      setClientError(t("requirements"));
      return;
    }

    if (password !== confirmPassword) {
      setClientError(t("mismatch"));
      return;
    }

    formAction(formData);
  }

  const error = clientError || state?.error;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {state?.success ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{t("success")}</AlertDescription>
            </Alert>
            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
              >
                {tLogin("submit")}
              </Link>
            </div>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {t("requirements")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "..." : t("submit")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
