"use client";
import { formatFen } from "@/lib/money";

type TrendPoint = { date: string; incomeFen: number; expenseFen: number; netFen: number };
export function TrendChart({ data }: { data: TrendPoint[] }) {
  const max = Math.max(...data.map((item) => Math.max(item.incomeFen, item.expenseFen)), 1);
  return <div className="trend-chart">{data.map((item) => <div className="trend-day" key={item.date}><div className="bar-stack"><span className="bar income" style={{ height: Math.max(3, (item.incomeFen / max) * 110) }} title={formatFen(item.incomeFen)} /><span className="bar expense" style={{ height: Math.max(3, (item.expenseFen / max) * 110) }} title={formatFen(item.expenseFen)} /></div><small>{item.date.slice(5)}</small></div>)}</div>;
}
