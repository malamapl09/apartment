import { setRequestLocale } from "next-intl/server";
import { RegisterWizard } from "@/components/register/register-wizard";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RegisterWizard />;
}
