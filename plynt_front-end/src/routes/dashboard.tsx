import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  FilePlus2,
  Gift,
  Loader2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageIntro, currency } from '@/components/shared/common';
import { CountUp, Reveal } from '@/components/shared/motion';
import { BalanceChart, ChartFrame, DonutChart, FlowChart } from '@/components/analytics/charts';
import { TransactionList } from '@/components/transactions/transaction-list';
import { SendDialog, ReceiveDialog } from '@/components/wallet/wallet-flows';
import { useWalletData } from '@/hooks/use-wallet-data';
import { useTransactions } from '@/hooks/use-transactions';
import { usePrivyUser } from '@/hooks/use-privy-user';

export const Route = createFileRoute('/dashboard')({
  head: () => ({
    meta: [
      { title: 'Dashboard — PLYNT' },
      { name: 'description', content: 'Your Monad wallet, activity, and financial overview.' },
      { property: 'og:title', content: 'Dashboard — PLYNT' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const nav = useNavigate();
  const [send, setSend] = useState(false);
  const [receive, setReceive] = useState(false);

  const { displayName, ready } = usePrivyUser();
  const { data: wallet, loading: walletLoading } = useWalletData();
  const { transactions, loading: txLoading } = useTransactions();

  const totalBalance = wallet?.totalBalance ?? 0;
  const assets = wallet?.assets ?? [];

  // Derived from real transactions
  const income = transactions
    .filter((t) => t.type === 'incoming')
    .reduce((s, t) => s + t.usdValue, 0);
  const expenses = transactions
    .filter((t) => t.type === 'outgoing' || t.type === 'payment')
    .reduce((s, t) => s + t.usdValue, 0);

  const loading = !ready || walletLoading;

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  const firstName = displayName.split(' ')[0] ?? displayName;

  const actions = [
    { title: 'Send', description: 'Send assets to another Monad wallet.', icon: ArrowUpRight, onClick: () => setSend(true) },
    { title: 'Receive', description: 'Receive assets into your wallet.', icon: ArrowDownLeft, onClick: () => setReceive(true) },
    { title: 'Create invoice', description: 'Request payment from a client.', icon: FilePlus2, onClick: () => nav({ to: '/invoices/new' }) },
    { title: 'Analytics', description: 'Understand your financial activity.', icon: ChartNoAxesCombined, onClick: () => nav({ to: '/analytics' }) },
  ];

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Reveal>
        <PageIntro
          title={`${greeting}, ${firstName}`}
          description="Here's your live Monad wallet activity."
        />
      </Reveal>

      {/* Hero wallet */}
      <Reveal delay={60}>
        <section className="wallet-hero">
          <div>
            <p className="text-sm text-primary-foreground/70">Total portfolio balance</p>
            <p className="mt-2 text-4xl font-semibold tracking-normal md:text-5xl">
              <CountUp value={totalBalance} prefix="$" decimals={2} />
            </p>
            <p className="mt-3 text-sm text-primary-foreground/70">
              {assets.map((a) => `${a.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${a.symbol}`).join(' · ')} · Monad Testnet
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSend(true)}><ArrowUpRight />Send</Button>
            <Button className="border border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setReceive(true)}>
              <ArrowDownLeft />Receive
            </Button>
          </div>
        </section>
      </Reveal>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {([
          { label: 'Total balance', value: totalBalance, prefix: '$', decimals: 2, sub: 'Monad Testnet', icon: Wallet },
          { label: 'Income', value: income, prefix: '$', sub: `${transactions.filter((t) => t.type === 'incoming').length} transactions`, icon: TrendingUp },
          { label: 'Expenses', value: expenses, prefix: '$', sub: `${transactions.filter((t) => t.type === 'outgoing' || t.type === 'payment').length} transactions`, icon: TrendingDown },
          { label: 'Transactions', value: transactions.length, prefix: '', sub: 'on-chain activity', icon: Activity },
        ] as const).map((stat, i) => (
          <Reveal key={stat.label} delay={80 + i * 45}>
            <section className="stat-card">
              <div className="flex items-start justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className="size-5 text-primary" />
              </div>
              <p className="mt-5 text-2xl font-semibold">
                <CountUp value={stat.value} prefix={stat.prefix} decimals={(stat as any).decimals} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
            </section>
          </Reveal>
        ))}
      </div>

      {/* Quick actions */}
      <section>
        <div className="mb-4">
          <h2 className="section-title">Quick actions</h2>
          <p className="section-subtitle">Move quickly through your most common workflows.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map((action, i) => (
            <Reveal key={action.title} delay={i * 50}>
              <button className="quick-action" onClick={action.onClick}>
                <span className="action-icon"><action.icon /></span>
                <span>
                  <strong>{action.title}</strong>
                  <small>{action.description}</small>
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Automations placeholder */}
      <Reveal delay={60}>
        <section className="panel">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="section-title flex items-center gap-2">
                <Zap className="size-5 text-primary" /> Money automation
              </h2>
              <p className="section-subtitle">Set up rules, recurring payments, salary splits and gifts.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => nav({ to: '/automations' })}>Manage rules</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Active automations', value: '—', sub: 'none set up yet', icon: Activity, to: '/automations' },
              { label: 'Recurring payments', value: '—', sub: 'none scheduled', icon: CalendarDays, to: '/recurring' },
              { label: 'Salary', value: '—', sub: 'not configured', icon: TrendingUp, to: '/salary' },
              { label: 'Gifts', value: '—', sub: 'none scheduled', icon: Gift, to: '/gifts' },
            ].map((item) => (
              <button key={item.label} onClick={() => nav({ to: item.to as any })} className="quick-action group flex-col items-start gap-2 text-left">
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <item.icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-semibold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </Reveal>

      {/* AI Insights placeholder */}
      <Reveal delay={70}>
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="section-title flex items-center gap-2">
                <Sparkles className="size-5 text-primary" /> AI Insights
              </h2>
              <p className="section-subtitle">Ask the AI assistant about your wallet activity.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => nav({ to: '/assistant' })}>Ask AI Assistant</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {transactions.length === 0 ? (
              <div className="insight border-l-primary bg-muted col-span-full">
                <p>No on-chain activity yet. Make your first transaction to see AI insights here.</p>
              </div>
            ) : [
              income > 0 && `You've received ${currency(income)} on Monad Testnet.`,
              expenses > 0 && `You've spent ${currency(expenses)} on Monad Testnet.`,
              totalBalance > 0 && `Your current portfolio value is ${currency(totalBalance)}.`,
            ].filter(Boolean).map((text, i) => (
              <div key={i} className="insight border-l-primary bg-muted">
                <p>{text as string}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Reveal className="xl:col-span-2">
          <ChartFrame title="Balance over time" subtitle="Portfolio value trend">
            <BalanceChart compact />
          </ChartFrame>
        </Reveal>
        <Reveal delay={70}>
          <ChartFrame title="Portfolio allocation" subtitle="Current asset distribution">
            <DonutChart data={assets.map((a) => ({ name: a.symbol, value: a.allocation }))} />
          </ChartFrame>
        </Reveal>
        <Reveal className="xl:col-span-2">
          <ChartFrame title="Income vs expenses" subtitle="On-chain activity">
            <FlowChart compact />
          </ChartFrame>
        </Reveal>
        <Reveal delay={70}>
          <section className="panel h-full">
            <h3 className="font-semibold">Invoice pulse</h3>
            <p className="mt-1 text-xs text-muted-foreground">Your payment requests</p>
            <div className="mt-6 flex min-h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            </div>
            <Button variant="outline" className="mt-5 w-full" onClick={() => nav({ to: '/invoices' })}>
              Create invoice
            </Button>
          </section>
        </Reveal>
      </div>

      {/* Recent transactions */}
      <Reveal>
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="section-title">Recent transactions</h2>
              <p className="section-subtitle">Latest on-chain activity from your wallet.</p>
            </div>
          </div>
          {txLoading ? (
            <div className="flex min-h-32 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <TransactionList
              transactions={transactions as any}
              limit={5}
              onViewAll={() => nav({ to: '/transactions' })}
            />
          )}
        </section>
      </Reveal>

      <SendDialog open={send} onOpenChange={setSend} assets={assets} />
      <ReceiveDialog open={receive} onOpenChange={setReceive} />
    </div>
  );
}
