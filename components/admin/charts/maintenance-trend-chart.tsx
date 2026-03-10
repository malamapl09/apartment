"use client";

import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TrendData = {
  month: string;
  [category: string]: string | number;
};

const CATEGORY_COLORS: Record<string, string> = {
  plumbing: "#3b82f6",
  electrical: "#f59e0b",
  hvac: "#8b5cf6",
  structural: "#ef4444",
  pest_control: "#10b981",
  general: "#6b7280",
};

export default function MaintenanceTrendChart({ data }: { data: TrendData[] }) {
  const t = useTranslations("admin.analytics");

  // Extract all unique categories from data
  const categories = new Set<string>();
  for (const d of data) {
    for (const key of Object.keys(d)) {
      if (key !== "month") categories.add(key);
    }
  }

  const hasData = data.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("maintenanceTrends")}</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {Array.from(categories).map((cat) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  name={t(`categories.${cat}`)}
                  stackId="a"
                  fill={CATEGORY_COLORS[cat] || "#6b7280"}
                  radius={[0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
