import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { checkBuildingsExist } from "@/lib/actions/setup";
import { SetupWizard } from "@/components/setup/setup-wizard";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { exists } = await checkBuildingsExist();
  if (exists) {
    redirect(`/${locale}/login`);
  }

  return <SetupWizard />;
}
