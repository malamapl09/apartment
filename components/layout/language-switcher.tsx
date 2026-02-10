"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const languages = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("language");

  function handleChange(newLocale: string) {
    router.replace(pathname, { locale: newLocale as "en" | "es" });
  }

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className="h-9 w-[72px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {t(lang.code)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
