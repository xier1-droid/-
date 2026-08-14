"use client";
import { formatFen } from "@/lib/money";

type TrendPoint = { date: string; label: string; incomeFen: number; expenseFen: number; netFen: number };
export function TrendChart({ data, granularity }: { data: TrendPoint[]; granularity: "day" | "week" | "month" }) {
  const max = Math.max(...data.map((item) => Math.max(item.incomeFen, item.expenseFen)), 1);
  return <div className={"trend-chart trend-" + granularity}>{data.map((item) => <div className="trend-day" key={item.date}><div className="bar-stack"><span className="bar income" style={{ height: Math.max(3, (item.incomeFen / max) * 110) }} title={"收入 " + formatFen(item.incomeFen)} /><span className="bar expense" style={{ height: Math.max(3, (item.expenseFen / max) * 110) }} title={"支出 " + formatFen(item.expenseFen)} /></div><small title={item.label}>{item.label}</small></div>)}</div>;
}
