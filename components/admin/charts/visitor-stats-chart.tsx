"use client";

import { useTranslations } from "next-intl";
import {
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

type VisitorData = {
  month: string;
  total: number;
  checkedIn: number;
  checkInRate: number;
};

export default function VisitorStatsChart({ data }: { data: VisitorData[] }) {
  const t = useTranslations("admin.analytics");

  const hasData = data.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("visitorStats")}</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="total"
                name={t("totalVisitors")}
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="checkedIn"
                name={t("checkedIn")}
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="checkInRate"
                name={t("checkInRate")}
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
