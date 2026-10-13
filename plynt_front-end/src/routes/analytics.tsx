import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Brain,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageIntro, currency } from "@/components/shared/common";
import { CountUp, Reveal } from "@/components/shared/motion";
import {
  ActivityGauge,
  BalanceChart,
  ChartFrame,
  ComposedVolumeChart,
  DonutChart,
  FlowChart,
  NetFlowChart,
  TxFrequencyChart,
  type ChartPoint,
} from "@/components/analytics/charts";
import { useWalletData } from "@/hooks/use-wallet-data";
import { useTransactions } from "@/hooks/use-transactions";
import type { OnChainTransaction } from "@/hooks/use-transactions";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — PLYNT" },
      { name: "description", content: "Understand your Monad balances, payment flows, and assets." },
      { property: "og:title", content: "Analytics — PLYNT" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

// ─── Build chart data from on-chain transactions ──────────────────────────────
function buildChartData(txs: OnChainTransaction[], days: number): ChartPoint[] {
  const now = Date.now();
  const map = new Map<string, ChartPoint>();

  // Initialise all days
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    map.set(key, { date: key, income: 0, expenses: 0, volume: 0, netFlow: 0, balance: 0 });
  }

  // Aggregate transactions
  for (const tx of txs) {
    const d = new Date(tx.timestamp);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const point = map.get(key);
    if (!point) continue;
    const usd = tx.usdValue;
    point.volume = (point.volume ?? 0) + usd;
    if (tx.type === "incoming") {
      point.income = (point.income ?? 0) + usd;
    } else {
      point.expenses = (point.expenses ?? 0) + usd;
    }
    point.netFlow = (point.income ?? 0) - (point.expenses ?? 0);
  }

  // Build running balance
  const points = Array.from(map.values());
  let runningBalance = 0;
  for (const p of points) {
    runningBalance += (p.income ?? 0) - (p.expenses ?? 0);
    p.balance = Math.max(0, runningBalance);
  }
  return points;
}

function buildTxFrequency(txs: OnChainTransaction[]): { day: string; count: number }[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = Array(7).fill(0) as number[];
  for (const tx of txs) {
    const d = new Date(tx.timestamp).getDay();
    counts[d] = (counts[d] ?? 0) + 1;
  }
  return days.map((day, i) => ({ day, count: counts[i] ?? 0 }));
}

const PERIOD_DAYS: Record<string, number> = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365 };

// ─── AI Overview component ────────────────────────────────────────────────────
function AiOverview({
  income,
  expenses,
  netFlow,
  totalBalance,
  totalVolume,
  avgTx,
  txCount,
  topAsset,
  winRate,
}: {
  income: number;
  expenses: number;
  netFlow: number;
  totalBalance: number;
  totalVolume: number;
  avgTx: number;
  txCount: number;
  topAsset: string;
  winRate: number;
}) {
  const [visible, setVisible] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setGenerating(false);
    setVisible(true);
  };

  const health = netFlow >= 0 ? "positive" : "negative";
  const healthColor = netFlow >= 0 ? "text-emerald-600" : "text-rose-500";
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  const insights: { icon: React.ElementType; text: string; type: "good" | "bad" | "tip" | "info" }[] = [];

  if (txCount === 0) {
    insights.push({ icon: Zap, text: "No on-chain activity detected yet. Start transacting to unlock full insights.", type: "info" });
  } else {
    if (savingsRate > 20) {
      insights.push({ icon: TrendingUp, text: `Strong savings rate of ${savingsRate.toFixed(1)}% — you're keeping more than you spend. Well done.`, type: "good" });
    } else if (savingsRate < 0) {
      insights.push({ icon: TrendingDown, text: `Spending exceeds income by ${currency(Math.abs(netFlow))}. Review your recent outflows.`, type: "bad" });
    }

    if (avgTx > 100) {
      insights.push({ icon: Activity, text: `Average transaction size is ${currency(avgTx)}, suggesting high-value activity on Monad.`, type: "info" });
    }

    if (winRate > 60) {
      insights.push({ icon: Sparkles, text: `${winRate.toFixed(0)}% of your transactions are inflows — strong positive momentum.`, type: "good" });
    }

    if (totalVolume > 0) {
      insights.push({ icon: Wallet, text: `Total on-chain volume: ${currency(totalVolume)} across ${txCount} transactions.`, type: "info" });
    }

    insights.push({ icon: Brain, text: `Your most active asset is ${topAsset}. Diversifying across MON, USDC, and WETH can reduce volatility.`, type: "tip" });

    if (totalBalance > 0) {
      insights.push({ icon: ArrowLeftRight, text: `Current wallet value: ${currency(totalBalance)} on Monad Testnet.`, type: "info" });
    }
  }

  const typeCls: Record<string, string> = {
    good: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
    bad: "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30",
    tip: "border-primary/30 bg-primary/5",
    info: "border-border bg-muted/30",
  };

  const typeIconCls: Record<string, string> = {
    good: "text-emerald-600",
    bad: "text-rose-500",
    tip: "text-primary",
    info: "text-muted-foreground",
  };

  return (
    <section className="panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Brain className="size-5 text-primary" />
            AI Financial Overview
          </h2>
          <p className="section-subtitle">Intelligent analysis of your on-chain activity.</p>
        </div>
        {!visible && (
          <Button onClick={handleGenerate} disabled={generating} size="sm">
            {generating ? <Loader2 className="animate-spin" /> : <Sparkles className="size-4" />}
            {generating ? "Analyzing…" : "Generate overview"}
          </Button>
        )}
        {visible && (
          <Button variant="outline" onClick={() => setVisible(false)} size="sm">
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        )}
      </div>

      {visible && (
        <div className="mt-6 space-y-4">
          {/* Summary strip */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Financial health</p>
              <p className={`mt-1 text-lg font-semibold capitalize ${healthColor}`}>{health}</p>
              <p className="text-xs text-muted-foreground">Net flow: {currency(Math.abs(netFlow))}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Savings rate</p>
              <p className={`mt-1 text-lg font-semibold ${savingsRate >= 0 ? "text-primary" : "text-rose-500"}`}>
                {savingsRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">of income retained</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Activity score</p>
              <p className="mt-1 text-lg font-semibold text-primary">
                {txCount === 0 ? "0" : txCount < 5 ? "Low" : txCount < 20 ? "Medium" : "High"}
              </p>
              <p className="text-xs text-muted-foreground">{txCount} transaction{txCount !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Insight cards */}
          <div className="grid gap-3 md:grid-cols-2">
            {insights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-lg border p-3.5 ${typeCls[ins.type]}`}>
                <ins.icon className={`mt-0.5 size-4 shrink-0 ${typeIconCls[ins.type]}`} />
                <p className="text-sm leading-relaxed">{ins.text}</p>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {txCount > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium text-primary mb-2">Recommendations</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {netFlow < 0 && <li>• Review your largest outgoing transactions and look for recurring costs to cut.</li>}
                {savingsRate < 20 && savingsRate >= 0 && <li>• Aim for a 20%+ savings rate to build a strong on-chain reserve.</li>}
                {savingsRate >= 20 && <li>• Consider staking or DeFi yield to put your savings to work.</li>}
                <li>• Enable auto-distribute on Salary to split income automatically as it arrives.</li>
                <li>• Use Gifts to schedule recurring payments — set-it-and-forget-it transfers.</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {!visible && !generating && (
        <div className="mt-6 flex min-h-24 flex-col items-center justify-center gap-2 text-center">
          <Brain className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Click "Generate overview" to get AI-powered insights about your wallet activity.</p>
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function Page() {
  const [period, setPeriod] = useState("30D");
  const { data: wallet, loading: wLoading } = useWalletData();
  const { transactions, loading: tLoading } = useTransactions();

  const loading = wLoading || tLoading;

  const days = PERIOD_DAYS[period] ?? 30;
  const filteredTxs = useMemo(() => {
    const cutoff = Date.now() - days * 86400000;
    return transactions.filter((t) => new Date(t.timestamp).getTime() >= cutoff);
  }, [transactions, days]);

  const income = filteredTxs.filter((t) => t.type === "incoming").reduce((s, t) => s + t.usdValue, 0);
  const expenses = filteredTxs.filter((t) => t.type === "outgoing" || t.type === "gift" || t.type === "invoice").reduce((s, t) => s + t.usdValue, 0);
  const totalVolume = filteredTxs.reduce((s, t) => s + t.usdValue, 0);
  const netFlow = income - expenses;
  const avgTx = filteredTxs.length > 0 ? totalVolume / filteredTxs.length : 0;
  const totalBalance = wallet?.totalBalance ?? 0;
  const winRate = filteredTxs.length > 0 ? (filteredTxs.filter((t) => t.type === "incoming").length / filteredTxs.length) * 100 : 0;

  const chartData = useMemo(() => buildChartData(filteredTxs, days), [filteredTxs, days]);
  const txFrequency = useMemo(() => buildTxFrequency(filteredTxs), [filteredTxs]);
  const assetDistribution = wallet?.assets.map((a) => ({ name: a.symbol, value: a.allocation })) ?? [];

  // Asset breakdown for donut (income by asset)
  const assetIncome = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of filteredTxs.filter((t) => t.type === "incoming")) {
      map[tx.asset] = (map[tx.asset] ?? 0) + tx.usdValue;
    }
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map).map(([name, value]) => ({
      name,
      value: total > 0 ? Math.round((value / total) * 100) : 0,
    }));
  }, [filteredTxs]);

  // Activity gauge data
  const activityGaugeData = [
    { name: "Income", value: income > 0 ? Math.min(100, Math.round((income / Math.max(totalVolume, 1)) * 100)) : 0, fill: "var(--primary)" },
    { name: "Expenses", value: expenses > 0 ? Math.min(100, Math.round((expenses / Math.max(totalVolume, 1)) * 100)) : 0, fill: "var(--chart-2)" },
    { name: "Net Flow", value: netFlow > 0 ? Math.min(100, Math.round((netFlow / Math.max(totalVolume, 1)) * 100)) : 0, fill: "oklch(.78 .07 84)" },
  ];

  const topAsset = wallet?.assets.sort((a, b) => b.usdValue - a.usdValue)[0]?.symbol ?? "MON";

  const stats = [
    { label: "Total volume", value: totalVolume, icon: Activity, color: "text-primary" },
    { label: "Income", value: income, icon: TrendingUp, color: "text-emerald-600" },
    { label: "Expenses", value: expenses, icon: TrendingDown, color: "text-rose-500" },
    { label: "Net flow", value: netFlow, icon: ArrowLeftRight, color: netFlow >= 0 ? "text-emerald-600" : "text-rose-500" },
    { label: "Total balance", value: totalBalance, icon: Wallet, color: "text-primary" },
  ] as const;

  return (
    <div className="space-y-7">
      <Reveal>
        <PageIntro title="Analytics" description="Live insights from your Monad on-chain activity." />
      </Reveal>

      {/* Period selector */}
      <div className="flex gap-2 overflow-x-auto">
        {["7D", "30D", "90D", "1Y"].map((p) => (
          <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)}>{p}</Button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {stats.map(({ label, value, icon: Icon, color }, i) => (
              <Reveal key={label} delay={i * 35}>
                <div className="stat-card">
                  <Icon className={`size-5 ${color}`} />
                  <p className="mt-4 text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-semibold">
                    <CountUp value={value as number} prefix="$" decimals={2} />
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Extra quick stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Transactions", value: filteredTxs.length.toString(), icon: Activity, sub: `in last ${period}` },
              { label: "Avg tx value", value: currency(avgTx), icon: ArrowLeftRight, sub: "per transaction" },
              { label: "Inflow rate", value: `${winRate.toFixed(0)}%`, icon: ArrowDownLeft, sub: "of all txs" },
              { label: "Top asset", value: topAsset, icon: Sparkles, sub: "by balance" },
            ].map(({ label, value, icon: Icon, sub }, i) => (
              <Reveal key={label} delay={i * 30}>
                <div className="stat-card flex items-start gap-3">
                  <span className="action-icon shrink-0 mt-0.5"><Icon className="size-4" /></span>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 font-semibold">{value}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* AI Overview */}
          <Reveal delay={40}>
            <AiOverview
              income={income}
              expenses={expenses}
              netFlow={netFlow}
              totalBalance={totalBalance}
              totalVolume={totalVolume}
              avgTx={avgTx}
              txCount={filteredTxs.length}
              topAsset={topAsset}
              winRate={winRate}
            />
          </Reveal>

          {/* Charts grid */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Reveal delay={50}>
              <ChartFrame title="Balance over time" subtitle={`${period} running balance`} badge={period}>
                <BalanceChart data={chartData} />
              </ChartFrame>
            </Reveal>

            <Reveal delay={60}>
              <ChartFrame title="Income vs Expenses" subtitle="Settled account activity by day">
                <FlowChart data={chartData} />
              </ChartFrame>
            </Reveal>

            <Reveal delay={70}>
              <ChartFrame title="Net flow trend" subtitle="Cumulative in − out per day">
                <NetFlowChart data={chartData} />
              </ChartFrame>
            </Reveal>

            <Reveal delay={80}>
              <ChartFrame title="Volume + flows" subtitle="Combined volume, income & expense lines">
                <ComposedVolumeChart data={chartData} />
              </ChartFrame>
            </Reveal>
          </div>

          {/* Bottom charts row */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Reveal delay={90}>
              <ChartFrame title="Asset distribution" subtitle="Portfolio allocation">
                <DonutChart data={assetDistribution.length > 0 ? assetDistribution : assetIncome} />
              </ChartFrame>
            </Reveal>

            <Reveal delay={95}>
              <ChartFrame title="Transaction frequency" subtitle="Activity by day of week">
                <TxFrequencyChart data={txFrequency} />
              </ChartFrame>
            </Reveal>

            <Reveal delay={100}>
              <ChartFrame title="Flow breakdown" subtitle="Income / expense / net as % of volume">
                <ActivityGauge data={activityGaugeData} />
              </ChartFrame>
            </Reveal>
          </div>

          {/* Text insights */}
          <Reveal delay={110}>
            <section className="panel">
              <h2 className="section-title">Quick Insights</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {filteredTxs.length === 0 ? (
                  <p className="insight col-span-2">No on-chain activity in this period. Start transacting to see insights here.</p>
                ) : [
                  income > 0 && `Total received: ${currency(income)} across ${filteredTxs.filter((t) => t.type === "incoming").length} inbound transactions.`,
                  expenses > 0 && `Total spent: ${currency(expenses)} across ${filteredTxs.filter((t) => t.type !== "incoming").length} outbound transactions.`,
                  netFlow !== 0 && `Net flow is ${netFlow > 0 ? "positive ↑" : "negative ↓"} at ${currency(Math.abs(netFlow))}.`,
                  avgTx > 0 && `Average transaction value: ${currency(avgTx)}.`,
                  winRate > 0 && `${winRate.toFixed(0)}% of your ${period} transactions are inflows.`,
                  totalBalance > 0 && `Current wallet value: ${currency(totalBalance)} on Monad Testnet.`,
                ].filter(Boolean).map((text, i) => (
                  <p key={i} className="insight">{text as string}</p>
                ))}
              </div>
            </section>
          </Reveal>
        </>
      )}
    </div>
  );
}
