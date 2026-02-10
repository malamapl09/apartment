import { useTranslations } from "next-intl";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  const t = useTranslations();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">404</CardTitle>
            <CardDescription className="mt-2 text-lg">
              {t("notFound.title", { default: "Page Not Found" })}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t("notFound.description", {
              default:
                "The page you are looking for doesn't exist or has been moved. Please check the URL or return to the dashboard.",
            })}
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild size="lg">
            <a href="/portal">
              <Home className="mr-2 h-4 w-4" />
              {t("notFound.goToDashboard", { default: "Go to Dashboard" })}
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
