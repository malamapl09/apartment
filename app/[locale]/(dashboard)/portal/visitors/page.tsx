import { getTranslations, setRequestLocale } from "next-intl/server";
import { getMyVisitors, cancelVisitor } from "@/lib/actions/visitors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, UserPlus, Users, Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { VisitorAccessCode } from "@/components/shared/visitor-access-code";
import type { Visitor, VisitorStatus } from "@/types";

function StatusBadge({ status }: { status: VisitorStatus }) {
  const classMap: Record<VisitorStatus, string> = {
    expected: "bg-blue-100 text-blue-800",
    checked_in: "bg-green-100 text-green-800",
    checked_out: "bg-gray-100 text-gray-800",
    expired: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const labelMap: Record<VisitorStatus, string> = {
    expected: "Expected",
    checked_in: "Checked In",
    checked_out: "Checked Out",
    expired: "Expired",
    cancelled: "Cancelled",
  };

  return (
    <Badge className={classMap[status]} variant="outline">
      {labelMap[status]}
    </Badge>
  );
}

function VisitorCard({ visitor, t }: { visitor: Visitor; t: (key: string) => string }) {
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Card key={visitor.id}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{visitor.visitor_name}</CardTitle>
            {visitor.purpose && (
              <CardDescription>{visitor.purpose}</CardDescription>
            )}
          </div>
          <StatusBadge status={visitor.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <VisitorAccessCode code={visitor.access_code} />
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div>
            <span className="block font-medium text-foreground">
              {t("validFrom")}
            </span>
            {formatDate(visitor.valid_from)}
          </div>
          <div>
            <span className="block font-medium text-foreground">
              {t("validUntil")}
            </span>
            {formatDate(visitor.valid_until)}
          </div>
        </div>
        {visitor.is_recurring && (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {visitor.recurrence_pattern}
          </Badge>
        )}
        {visitor.status === "expected" && (
          <form
            action={async () => {
              "use server";
              await cancelVisitor(visitor.id);
            }}
          >
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
            >
              {t("cancelVisitor")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ t }: { t: (key: string) => string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t("noVisitors")}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {t("noVisitorsDescription")}
        </p>
        <Button asChild>
          <Link href="/portal/visitors/new">
            <UserPlus className="mr-2 h-4 w-4" />
            {t("registerVisitor")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default async function PortalVisitorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal.visitors");

  const [expectedResult, pastResult, allResult] = await Promise.all([
    getMyVisitors("expected"),
    getMyVisitors("past"),
    getMyVisitors("all"),
  ]);

  if (expectedResult.error && pastResult.error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{expectedResult.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const expected = (expectedResult.data ?? []) as Visitor[];
  const past = (pastResult.data ?? []) as Visitor[];
  const all = (allResult.data ?? []) as Visitor[];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href="/portal/visitors/new">
            <UserPlus className="mr-2 h-4 w-4" />
            {t("registerVisitor")}
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="expected" className="space-y-6">
        <TabsList>
          <TabsTrigger value="expected" className="gap-2">
            {t("tabs.expected")}
            {expected.length > 0 && (
              <Badge variant="secondary">{expected.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">{t("tabs.past")}</TabsTrigger>
          <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
        </TabsList>

        <TabsContent value="expected" className="space-y-4">
          {expected.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {expected.map((visitor) => (
                <VisitorCard key={visitor.id} visitor={visitor} t={t} />
              ))}
            </div>
          ) : (
            <EmptyState t={t} />
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {past.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((visitor) => (
                <VisitorCard key={visitor.id} visitor={visitor} t={t} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("noVisitors")}
                </h3>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {all.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {all.map((visitor) => (
                <VisitorCard key={visitor.id} visitor={visitor} t={t} />
              ))}
            </div>
          ) : (
            <EmptyState t={t} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
