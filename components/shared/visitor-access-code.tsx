"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useTranslations } from "next-intl";

interface VisitorAccessCodeProps {
  code: string;
}

export function VisitorAccessCode({ code }: VisitorAccessCodeProps) {
  const t = useTranslations("portal.visitors");
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text for manual copy
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/50 p-6">
      <p className="text-sm text-muted-foreground">{t("accessCode")}</p>
      <span className="font-mono text-4xl font-bold tracking-[0.25em] text-primary">
        {code}
      </span>
      <p className="text-xs text-muted-foreground">{t("shareCode")}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="gap-2"
        aria-label={t("copyCode")}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {copied ? t("codeCopied") : t("copyCode")}
      </Button>
    </div>
  );
}
