"use client";

import { useTranslations } from "next-intl";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OccupancyData = {
  occupied: number;
  vacant: number;
};

const COLORS = ["#3b82f6", "#e2e8f0"];

export default function OccupancyChart({ data }: { data: OccupancyData | null }) {
  const t = useTranslations("admin.analytics");

  const hasData = data && (data.occupied > 0 || data.vacant > 0);

  const chartData = hasData
    ? [
        { name: t("occupied"), value: data.occupied },
        { name: t("vacant"), value: data.vacant },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("occupancy")}</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
