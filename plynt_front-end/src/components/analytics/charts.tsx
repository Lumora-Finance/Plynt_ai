import { useEffect, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Client-only wrapper (prevents SSR hydration mismatch) ────────────────────
function ClientChart({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-64 animate-pulse bg-muted" />;
  return <>{children}</>;
}

export function ChartFrame({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel", className)}>
      <div className="mb-6">
        <h3 className="font-semibold">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

const tick = { fill: "var(--muted-foreground)", fontSize: 11 };

export interface ChartPoint {
  date: string;
  balance?: number;
  income?: number;
  expenses?: number;
}

// ─── Empty state placeholder shown when there's no data ───────────────────────
function EmptyChart({ height = "h-56" }: { height?: string }) {
  return (
    <div className={cn(height, "flex items-center justify-center")}>
      <p className="text-xs text-muted-foreground">No data yet — start transacting to see charts.</p>
    </div>
  );
}

// ─── Balance over time ────────────────────────────────────────────────────────
export function BalanceChart({
  compact = false,
  data = [],
}: {
  compact?: boolean;
  data?: ChartPoint[];
}) {
  if (data.length === 0) return <EmptyChart height={compact ? "h-56" : "h-72"} />;
  return (
    <ClientChart>
      <div className={compact ? "h-56" : "h-72"}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -18, right: 4, top: 8 }}>
            <defs>
              <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={tick} axisLine={false} tickLine={false} />
            <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
            <ChartTooltip
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--popover-foreground)" }}
              formatter={(v: number) => [`$${v.toLocaleString()}`, "Balance"]}
            />
            <Area type="monotone" dataKey="balance" stroke="var(--primary)" strokeWidth={2.5} fill="url(#goldFill)" animationDuration={700} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ClientChart>
  );
}

// ─── Income vs Expenses ───────────────────────────────────────────────────────
export function FlowChart({
  compact = false,
  data = [],
}: {
  compact?: boolean;
  data?: ChartPoint[];
}) {
  if (data.length === 0) return <EmptyChart height={compact ? "h-56" : "h-72"} />;
  return (
    <ClientChart>
      <div className={compact ? "h-56" : "h-72"}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -18, right: 4, top: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={tick} axisLine={false} tickLine={false} />
            <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
            <ChartTooltip
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--popover-foreground)" }}
            />
            <Bar dataKey="income" fill="var(--primary)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="expenses" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ClientChart>
  );
}

// ─── Donut / Pie chart ────────────────────────────────────────────────────────
export function DonutChart({ data = [] }: { data?: { name: string; value: number }[] }) {
  if (data.length === 0) return <EmptyChart />;
  return (
    <ClientChart>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === 0 ? "var(--primary)" : i === 1 ? "var(--chart-2)" : "var(--chart-3)"} />
              ))}
            </Pie>
            <ChartTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--popover-foreground)" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {data.map((item, i) => (
          <span key={item.name} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("size-2 rounded-full", i === 0 ? "bg-primary" : i === 1 ? "bg-chart-2" : "bg-chart-3")} />
            {item.name} {item.value}%
          </span>
        ))}
      </div>
    </ClientChart>
  );
}
