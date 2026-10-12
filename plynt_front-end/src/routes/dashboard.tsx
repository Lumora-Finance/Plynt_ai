import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  ChartNoAxesCombined,
  Eye,
  EyeOff,
  FilePlus2,
  Globe,
  Loader2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageIntro, currency, IconButton } from '@/components/shared/common';
import { CountUp, Reveal } from '@/components/shared/motion';
import { BalanceChart, ChartFrame, FlowChart } from '@/components/analytics/charts';
import { TransactionList } from '@/components/transactions/transaction-list';
import { SendDialog, ReceiveDialog } from '@/components/wallet/wallet-flows';
import { useWalletData } from '@/hooks/use-wallet-data';
import { useTransactions } from '@/hooks/use-transactions';
import { usePrivyUser } from '@/hooks/use-privy-user';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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

const VISIBILITY_KEY = 'plynt:wallet:visible';

function NetworkSwitch({ onMainnet }: { onMainnet: () => void }) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-full border border-primary-foreground/20 bg-primary-foreground/5 p-0.5 text-xs font-medium">
      <span className="flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-primary-foreground">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Testnet
      </span>
      <button
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-primary-foreground/60 transition-colors hover:text-primary-foreground"
        onClick={onMainnet}
      >
        <Globe className="size-3" />
        Mainnet
      </button>
    </div>
  );
}

function ComingSoonDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl">🔜 Mainnet Coming Soon</DialogTitle>
          <DialogDescription className="mt-2 text-base leading-relaxed">
            Plynt is currently live on <strong>Monad Testnet</strong>.<br /><br />
            Mainnet support is on the roadmap — stay tuned!
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col items-center gap-3">
          <div className="w-full rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            🟣 Currently on Monad Testnet · Chain ID 10143
          </div>
          <Button onClick={onClose} className="w-full">Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DashboardPage() {
  const nav = useNavigate();
  const [send, setSend] = useState(false);
  const [receive, setReceive] = useState(false);
  const [mainnetDialog, setMainnetDialog] = useState(false);

  // Shared visibility toggle — synced with wallet page via localStorage
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(VISIBILITY_KEY) !== 'false'; } catch { return true; }
  });

  const { displayName, ready } = usePrivyUser();
  const { data: wallet, loading: walletLoading } = useWalletData();
  const { transactions, loading: txLoading } = useTransactions();

  const totalBalance = wallet?.totalBalance ?? 0;
  const assets = wallet?.assets ?? [];
  const monAsset = assets.find((a) => a.symbol === 'MON');

  const income = transactions.filter((t) => t.type === 'incoming').reduce((s, t) => s + t.usdValue, 0);
  const expenses = transactions.filter((t) => t.type === 'outgoing' || t.type === 'payment').reduce((s, t) => s + t.usdValue, 0);

  const loading = !ready || walletLoading;

  // Persist visibility
  useEffect(() => {
    try { localStorage.setItem(VISIBILITY_KEY, String(visible)); } catch { /* ignore */ }
  }, [visible]);

  // Sync from other pages
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === VISIBILITY_KEY && e.newValue !== null) setVisible(e.newValue !== 'false');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = displayName.split(' ')[0] ?? displayName;

  const actions = [
    { title: 'Send', description: 'Send MON to another wallet.', icon: ArrowUpRight, onClick: () => setSend(true) },
    { title: 'Receive', description: 'Receive MON into your wallet.', icon: ArrowDownLeft, onClick: () => setReceive(true) },
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
            <div className="flex items-center gap-2">
              <p className="text-sm text-primary-foreground/70">Total balance</p>
              <IconButton
                label={visible ? 'Hide balance' : 'Show balance'}
                className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={() => setVisible((v) => !v)}
              >
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </IconButton>
            </div>
            <p className="mt-2 text-4xl font-semibold tracking-normal md:text-5xl">
              {visible ? <CountUp value={totalBalance} prefix="$" decimals={2} /> : '••••••'}
            </p>
            <p className="mt-2 font-mono text-base text-primary-foreground/80">
              {visible
                ? `${(monAsset?.balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} MON`
                : '•••• MON'}{' '}
              · Monad Testnet
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <NetworkSwitch onMainnet={() => setMainnetDialog(true)} />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setSend(true)}><ArrowUpRight />Send</Button>
              <Button className="border border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setReceive(true)}>
                <ArrowDownLeft />Receive
              </Button>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {([
          { label: 'MON Balance', value: visible ? totalBalance : 0, prefix: '$', decimals: 2, sub: visible ? `${(monAsset?.balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} MON` : '••••', icon: Wallet },
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
                {i === 0 && !visible
                  ? '••••'
                  : <CountUp value={stat.value} prefix={stat.prefix} decimals={(stat as any).decimals} />}
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

      {/* AI Insights */}
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
              totalBalance > 0 && `Your current MON balance is ${currency(totalBalance)}.`,
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
          <ChartFrame title="Balance over time" subtitle="MON portfolio value trend">
            <BalanceChart compact />
          </ChartFrame>
        </Reveal>
        <Reveal delay={70}>
          <ChartFrame title="MON allocation" subtitle="Native token · 100% of wallet">
            <div className="flex h-56 flex-col items-center justify-center gap-3">
              <div className="grid size-24 place-items-center rounded-full border-4 border-primary bg-primary/10">
                <span className="text-2xl font-bold text-primary">M</span>
              </div>
              <div className="text-center">
                <p className="font-semibold">MON</p>
                <p className="text-xs text-muted-foreground">100% · Native token</p>
                <p className="mt-1 font-mono text-sm">
                  {visible
                    ? `${(monAsset?.balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} MON`
                    : '•••• MON'}
                </p>
              </div>
            </div>
          </ChartFrame>
        </Reveal>
        <Reveal className="xl:col-span-2">
          <ChartFrame title="Income vs expenses" subtitle="On-chain MON activity">
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
              <p className="section-subtitle">Latest on-chain MON activity from your wallet.</p>
            </div>
          </div>
          {txLoading ? (
            <div className="flex min-h-32 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <TransactionList transactions={transactions as any} limit={5} onViewAll={() => nav({ to: '/transactions' })} />
          )}
        </section>
      </Reveal>

      <SendDialog open={send} onOpenChange={setSend} assets={assets} />
      <ReceiveDialog open={receive} onOpenChange={setReceive} />
      <ComingSoonDialog open={mainnetDialog} onClose={() => setMainnetDialog(false)} />
    </div>
  );
}
