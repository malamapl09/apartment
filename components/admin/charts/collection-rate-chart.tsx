"use client";

import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MonthData = {
  month: number;
  totalCharged: number;
  totalCollected: number;
  collectionRate: number;
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function CollectionRateChart({ data }: { data: MonthData[] }) {
  const t = useTranslations("admin.analytics");

  const chartData = data.map((d) => ({
    ...d,
    name: MONTH_LABELS[d.month - 1],
  }));

  const hasData = data.some((d) => d.totalCharged > 0 || d.totalCollected > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("collectionRate")}</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="totalCharged"
                name={t("totalCharged")}
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="totalCollected"
                name={t("totalCollected")}
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="collectionRate"
                name={t("collectionRatePercent")}
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
