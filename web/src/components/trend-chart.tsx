"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatFen } from "@/lib/money";

type TrendPoint = { date: string; label: string; incomeFen: number; expenseFen: number; netFen: number };

export function TrendChart({ data }: { data: TrendPoint[]; granularity: "day" | "week" | "month" }) {
  const tickInterval = data.length > 16 ? Math.ceil(data.length / 6) - 1 : data.length > 8 ? 1 : 0;

  return <div className="trend-chart">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 5, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#edf0eb" />
        <XAxis dataKey="label" interval={tickInterval} tick={{ fill: "#78827c", fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={12} />
        <YAxis hide domain={[0, "auto"]} />
        <Tooltip formatter={(value, name) => [formatFen(Number(value)), name === "incomeFen" ? "收入" : "支出"]} labelStyle={{ color: "#1e302a" }} contentStyle={{ border: "1px solid #e3e7df", borderRadius: 8, fontSize: 12 }} />
        <Line type="monotone" dataKey="incomeFen" stroke="#278665" strokeWidth={2} dot={data.length <= 8 ? { r: 2 } : false} activeDot={{ r: 3 }} isAnimationActive={false} />
        <Line type="monotone" dataKey="expenseFen" stroke="#dc746c" strokeWidth={2} dot={data.length <= 8 ? { r: 2 } : false} activeDot={{ r: 3 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}
