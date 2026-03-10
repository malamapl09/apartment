import { getTranslations, setRequestLocale } from "next-intl/server";
import { getMyCharges, getMyBalance } from "@/lib/actions/fees";
import { MyChargesList } from "@/components/portal/my-charges-list";
import { MyBalanceCard } from "@/components/portal/my-balance-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, History } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ChargeWithDetails } from "@/types";

export default async function PortalFeesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal.fees");

  const [
    { data: allCharges, error: chargesError },
    { balance, error: balanceError },
  ] = await Promise.all([getMyCharges("all"), getMyBalance()]);

  const error = chargesError || balanceError;

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const charges = (allCharges || []) as ChargeWithDetails[];
  const pendingCharges = charges.filter((c) =>
    ["pending", "overdue", "partial"].includes(c.status)
  );
  const paidCharges = charges.filter((c) => c.status === "paid");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/portal/fees/history">
            <History className="mr-2 h-4 w-4" />
            {t("viewHistory")}
          </Link>
        </Button>
      </div>

      {/* Balance Card */}
      <MyBalanceCard balance={balance ?? 0} />

      {/* Charges Tabs */}
      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="pending">
            {t("status.pending")}
            {pendingCharges.length > 0 && (
              <span className="ml-1.5 rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                {pendingCharges.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="paid">{t("status.paid")}</TabsTrigger>
          <TabsTrigger value="all">{t("myCharges")}</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <MyChargesList
            charges={pendingCharges}
            emptyMessage={t("noCharges")}
            emptyDescription={t("noOutstanding")}
          />
        </TabsContent>

        <TabsContent value="paid" className="mt-4">
          <MyChargesList
            charges={paidCharges}
            emptyMessage={t("noCharges")}
            emptyDescription={t("noChargesDescription")}
          />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <MyChargesList
            charges={charges}
            emptyMessage={t("noCharges")}
            emptyDescription={t("noChargesDescription")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
