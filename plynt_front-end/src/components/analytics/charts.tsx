import { useEffect, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, LineChart, Pie, PieChart, RadialBar, RadialBarChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Client-only wrapper ──────────────────────────────────────────────────────
function ClientChart({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-64 animate-pulse rounded-md bg-muted" />;
  return <>{children}</>;
}

export function ChartFrame({
  title,
  subtitle,
  children,
  className,
  badge,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  badge?: string;
}) {
  return (
    <section className={cn("panel", className)}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {badge && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{badge}</span>
        )}
      </div>
      {children}
    </section>
  );
}

const tick = { fill: "var(--muted-foreground)", fontSize: 11 };
const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--popover-foreground)",
  fontSize: 12,
};

export interface ChartPoint {
  date: string;
  balance?: number;
  income?: number;
  expenses?: number;
  volume?: number;
  netFlow?: number;
  txCount?: number;
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function EmptyChart({ height = "h-56" }: { height?: string }) {
  return (
    <div className={cn(height, "flex items-center justify-center")}>
      <p className="text-xs text-muted-foreground">No data yet — start transacting to see charts.</p>
    </div>
  );
}

const fmt$ = (v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(2)}`;

// ─── Balance over time (Area) ─────────────────────────────────────────────────
export function BalanceChart({ compact = false, data = [] }: { compact?: boolean; data?: ChartPoint[] }) {
  if (data.length === 0) return <EmptyChart height={compact ? "h-56" : "h-72"} />;
  return (
    <ClientChart>
      <div className={compact ? "h-56" : "h-72"}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -18, right: 4, top: 8 }}>
            <defs>
              <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={tick} axisLine={false} tickLine={false} />
            <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={fmt$} />
            <ChartTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, "Balance"]} />
            <Area type="monotone" dataKey="balance" stroke="var(--primary)" strokeWidth={2.5} fill="url(#goldFill)" animationDuration={700} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ClientChart>
  );
}

// ─── Income vs Expenses (Grouped Bar) ────────────────────────────────────────
export function FlowChart({ compact = false, data = [] }: { compact?: boolean; data?: ChartPoint[] }) {
  if (data.length === 0) return <EmptyChart height={compact ? "h-56" : "h-72"} />;
  return (
    <ClientChart>
      <div className={compact ? "h-56" : "h-72"}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -18, right: 4, top: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={tick} axisLine={false} tickLine={false} />
            <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={fmt$} />
            <ChartTooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
            <Legend formatter={(v) => <span className="text-xs text-muted-foreground capitalize">{v}</span>} />
            <Bar dataKey="income" name="Income" fill="var(--primary)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ClientChart>
  );
}

// ─── Donut / Pie chart ────────────────────────────────────────────────────────
export function DonutChart({ data = [] }: { data?: { name: string; value: number }[] }) {
  if (data.length === 0) return <EmptyChart />;
  const CHART_COLORS = ["var(--primary)", "var(--chart-2)", "var(--chart-3)", "#f59e0b", "#8b5cf6", "#f43f5e"];
  return (
    <ClientChart>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {data.map((item, i) => (
          <span key={item.name} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            {item.name} {item.value}%
          </span>
        ))}
      </div>
    </ClientChart>
  );
}

// ─── Net flow line chart ──────────────────────────────────────────────────────
export function NetFlowChart({ data = [] }: { data?: ChartPoint[] }) {
  if (data.length === 0) return <EmptyChart />;
  return (
    <ClientChart>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -18, right: 4, top: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={tick} axisLine={false} tickLine={false} />
            <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={fmt$} />
            <ChartTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, "Net Flow"]} />
            <Line
              type="monotone"
              dataKey="netFlow"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              animationDuration={700}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ClientChart>
  );
}

// ─── Composed Income + Volume (ComposedChart) ─────────────────────────────────
export function ComposedVolumeChart({ data = [] }: { data?: ChartPoint[] }) {
  if (data.length === 0) return <EmptyChart height="h-64" />;
  return (
    <ClientChart>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: -18, right: 4, top: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={tick} axisLine={false} tickLine={false} />
            <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={fmt$} />
            <ChartTooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
            <Legend formatter={(v) => <span className="text-xs text-muted-foreground capitalize">{v}</span>} />
            <Bar dataKey="volume" name="Volume" fill="var(--primary)" opacity={0.3} radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="income" name="Income" stroke="var(--primary)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="expenses" name="Expenses" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ClientChart>
  );
}

// ─── Transaction frequency bar chart ─────────────────────────────────────────
export function TxFrequencyChart({ data = [] }: { data?: { day: string; count: number }[] }) {
  if (data.length === 0) return <EmptyChart height="h-48" />;
  return (
    <ClientChart>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -18, right: 4, top: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tick={tick} axisLine={false} tickLine={false} />
            <YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} />
            <ChartTooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} formatter={(v: number) => [v, "Transactions"]} />
            <Bar dataKey="count" fill="var(--primary)" radius={[3, 3, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fillOpacity={0.6 + (0.4 * i) / Math.max(data.length - 1, 1)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ClientChart>
  );
}

// ─── Radial activity gauge ────────────────────────────────────────────────────
export function ActivityGauge({ data = [] }: { data?: { name: string; value: number; fill: string }[] }) {
  if (data.length === 0) return <EmptyChart height="h-48" />;
  return (
    <ClientChart>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" barSize={12} data={data}>
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "var(--muted)" }} />
            <ChartTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, ""]} />
            <Legend iconSize={10} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </ClientChart>
  );
}
