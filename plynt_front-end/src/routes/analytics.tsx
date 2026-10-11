import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Activity, ArrowLeftRight, Loader2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageIntro, currency } from '@/components/shared/common';
import { CountUp, Reveal } from '@/components/shared/motion';
import { BalanceChart, ChartFrame, DonutChart, FlowChart } from '@/components/analytics/charts';
import { useWalletData } from '@/hooks/use-wallet-data';
import { useTransactions } from '@/hooks/use-transactions';

export const Route = createFileRoute('/analytics')({
  head: () => ({
    meta: [
      { title: 'Analytics — PLYNT' },
      { name: 'description', content: 'Understand your Monad balances, payment flows, and assets.' },
      { property: 'og:title', content: 'Analytics — PLYNT' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Page,
});

function Page() {
  const [period, setPeriod] = useState('30D');
  const { data: wallet, loading: wLoading } = useWalletData();
  const { transactions, loading: tLoading } = useTransactions();

  const loading = wLoading || tLoading;

  const income = transactions.filter((t) => t.type === 'incoming').reduce((s, t) => s + t.usdValue, 0);
  const expenses = transactions.filter((t) => t.type === 'outgoing' || t.type === 'payment').reduce((s, t) => s + t.usdValue, 0);
  const totalVolume = transactions.reduce((s, t) => s + t.usdValue, 0);
  const netFlow = income - expenses;
  const avgTx = transactions.length > 0 ? totalVolume / transactions.length : 0;
  const totalBalance = wallet?.totalBalance ?? 0;

  const assetDistribution = wallet?.assets.map((a) => ({ name: a.symbol, value: a.allocation })) ?? [];

  const stats = [
    ['Total volume', totalVolume, Activity],
    ['Income', income, TrendingUp],
    ['Expenses', expenses, TrendingDown],
    ['Net flow', netFlow, ArrowLeftRight],
    ['Total balance', totalBalance, Wallet],
  ] as const;

  return (
    <div className="space-y-7">
      <Reveal>
        <PageIntro title="Analytics" description="Live insights from your Monad on-chain activity." />
      </Reveal>

      <div className="flex gap-2 overflow-x-auto">
        {['7D', '30D', '90D', '1Y', 'Custom'].map((p) => (
          <Button key={p} variant={period === p ? 'default' : 'outline'} size="sm" onClick={() => setPeriod(p)}>{p}</Button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {stats.map(([label, value, Icon], i) => (
              <Reveal key={label} delay={i * 35}>
                <div className="stat-card">
                  <Icon className="size-5 text-primary" />
                  <p className="mt-4 text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-semibold">
                    <CountUp value={value as number} prefix="$" decimals={2} />
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartFrame title="Balance over time" subtitle={`${period} view`}><BalanceChart /></ChartFrame>
            <ChartFrame title="Income vs expenses" subtitle="Settled account activity"><FlowChart /></ChartFrame>
            <ChartFrame title="Asset distribution"><DonutChart data={assetDistribution} /></ChartFrame>
          </div>

          <section className="panel">
            <h2 className="section-title">Insights</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {transactions.length === 0 ? (
                <p className="insight">No on-chain activity yet. Start transacting to see insights here.</p>
              ) : [
                income > 0 && `You've received ${currency(income)} in total.`,
                expenses > 0 && `You've spent ${currency(expenses)} in total.`,
                netFlow !== 0 && `Net flow is ${netFlow > 0 ? 'positive' : 'negative'} at ${currency(Math.abs(netFlow))}.`,
                avgTx > 0 && `Average transaction value: ${currency(avgTx)}.`,
              ].filter(Boolean).map((text, i) => (
                <p key={i} className="insight">{text as string}</p>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
