"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
  AlertCircle,
} from "lucide-react";
import { bulkImportResidents } from "@/lib/actions/admin-import";
import type { ImportResult } from "@/lib/actions/admin-import";
import { toast } from "sonner";

export function BulkImportForm() {
  const t = useTranslations("admin.owners.import");
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.endsWith(".csv")) {
        setError(t("csvOnly"));
        setFile(null);
        return;
      }
      if (selected.size > 1024 * 1024) {
        setError(t("fileTooLarge"));
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const res = await bulkImportResidents(text);

      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setResult(res.data);
        if (res.data.successful > 0) {
          toast.success(
            t("successToast", { count: res.data.successful })
          );
        }
        if (res.data.failed > 0) {
          toast.error(t("failedToast", { count: res.data.failed }));
        }
      }
    } catch {
      setError(t("unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "full_name,email,phone,unit_number,role\nJohn Doe,john@example.com,+1234567890,101,owner\nJane Smith,jane@example.com,,102,resident\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("instructionsTitle")}</CardTitle>
          <CardDescription>{t("instructionsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <p className="font-medium">{t("requiredColumns")}</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">full_name</code> — {t("colFullName")}</li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">email</code> — {t("colEmail")}</li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">unit_number</code> — {t("colUnit")}</li>
            </ul>
            <p className="font-medium mt-3">{t("optionalColumns")}</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">phone</code> — {t("colPhone")}</li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">role</code> — {t("colRole")}</li>
            </ul>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            {t("downloadTemplate")}
          </Button>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle>{t("uploadTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{file.name}</span>
                <Badge variant="secondary">
                  {(file.size / 1024).toFixed(1)} KB
                </Badge>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t("dropzone")}
                </p>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("errorTitle")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleImport}
              disabled={!file || isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isLoading ? t("importing") : t("importButton")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{t("resultsTitle")}</CardTitle>
            <CardDescription>
              {t("resultsSummary", {
                total: result.total,
                successful: result.successful,
                failed: result.failed,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <div className="text-center p-3 rounded-md bg-muted">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-xs text-muted-foreground">{t("totalRows")}</p>
              </div>
              <div className="text-center p-3 rounded-md bg-green-500/10">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {result.successful}
                </p>
                <p className="text-xs text-muted-foreground">{t("successfulRows")}</p>
              </div>
              <div className="text-center p-3 rounded-md bg-red-500/10">
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {result.failed}
                </p>
                <p className="text-xs text-muted-foreground">{t("failedRows")}</p>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">{t("colRow")}</TableHead>
                    <TableHead>{t("colEmail")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("colUnit")}</TableHead>
                    <TableHead>{t("colStatus")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("colDetails")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.results.map((r) => (
                    <TableRow key={r.row}>
                      <TableCell className="font-mono text-sm">{r.row}</TableCell>
                      <TableCell className="text-sm">{r.email}</TableCell>
                      <TableCell className="text-sm hidden sm:table-cell">{r.unit_number}</TableCell>
                      <TableCell>
                        {r.success ? (
                          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            {t("statusSuccess")}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="mr-1 h-3 w-3" />
                            {t("statusFailed")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {r.error || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
