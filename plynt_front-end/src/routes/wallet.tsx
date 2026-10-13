import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Clock,
  Copy,
  DollarSign,
  Eye,
  EyeOff,
  FilePlus2,
  Info,
  Loader2,
  QrCode,
  RadioTower,
  RefreshCw,
  Repeat2,
  Rocket,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageIntro, IconButton, currency, shorten } from '@/components/shared/common';
import { CountUp, Reveal } from '@/components/shared/motion';
import { TransactionList } from '@/components/transactions/transaction-list';
import { ReceiveDialog, SendDialog } from '@/components/wallet/wallet-flows';
import { useWalletData } from '@/hooks/use-wallet-data';
import { useTransactions } from '@/hooks/use-transactions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export const Route = createFileRoute('/wallet')({
  head: () => ({
    meta: [
      { title: 'Wallet — PLYNT' },
      { name: 'description', content: 'Manage your Monad assets with live balances.' },
    ],
  }),
  component: WalletPage,
});

const VISIBILITY_KEY = 'plynt:wallet:visible';

// ─── Network switcher pill ────────────────────────────────────────────────────
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
        <Rocket className="size-3" />
        Mainnet
      </button>
    </div>
  );
}

// ─── Network banner ───────────────────────────────────────────────────────────
function NetworkBanner({ onMainnetClick }: { onMainnetClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <RadioTower className="size-4 text-primary" />
        </span>
        <p className="text-sm font-medium">Monad Testnet</p>
      </div>
      <button
        onClick={onMainnetClick}
        className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        <Rocket className="size-3" />
        Mainnet soon
      </button>
    </div>
  );
}

// ─── Mainnet coming soon dialog ───────────────────────────────────────────────
function ComingSoonDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="size-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">Mainnet Coming Soon</DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            Plynt is currently live on <strong>Monad Testnet</strong>. Mainnet support is on
            the roadmap — stay tuned!
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <RadioTower className="size-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Monad Testnet</p>
              <p className="font-mono text-xs text-muted-foreground">Chain ID 10143</p>
            </div>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 opacity-50">
            <Zap className="size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Monad Mainnet</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3" />
              Soon
            </span>
          </div>
          <Button onClick={onClose} className="w-full">Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WalletPage() {
  const nav = useNavigate();

  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(VISIBILITY_KEY) !== 'false'; } catch { return true; }
  });
  const [send, setSend] = useState(false);
  const [receive, setReceive] = useState(false);
  const [mainnetDialog, setMainnetDialog] = useState(false);
  const [comingSoonType, setComingSoonType] = useState<'swap' | 'convert' | null>(null);

  const { data, loading, error, address, refetch, walletTimedOut } = useWalletData();
  const { transactions, loading: txLoading } = useTransactions();

  useEffect(() => {
    try { localStorage.setItem(VISIBILITY_KEY, String(visible)); } catch { /* noop */ }
  }, [visible]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === VISIBILITY_KEY && e.newValue !== null) setVisible(e.newValue !== 'false');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const copy = () => {
    if (address) { navigator.clipboard?.writeText(address); toast.success('Wallet address copied'); }
  };

  // Show spinner only while actively loading and not timed out
  if (loading && !walletTimedOut) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  // Wallet timed out — show a friendly retry state
  if (walletTimedOut && !address) {
    return (
      <div className="space-y-8">
        <PageIntro title="Wallet" description="Your Monad embedded wallet." />
        <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded border border-dashed border-border p-8 text-center">
          <Loader2 className="size-8 text-muted-foreground/40" />
          <div>
            <p className="font-medium">Your wallet is being created</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Privy is setting up your embedded wallet. This usually takes a few seconds.<br />
              If this persists, try refreshing the page.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" /> Refresh page
          </Button>
        </div>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="space-y-8">
        <PageIntro title="Wallet" description="Your Monad embedded wallet." />
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No wallet found. Sign in to create your embedded wallet.</p>
        </div>
      </div>
    );
  }

  const walletAddress = data?.address ?? address;
  const totalBalance = data?.totalBalance ?? 0;
  const assets = data?.assets ?? [];
  const monAsset = assets.find((a) => a.symbol === 'MON');

  const income = transactions.filter((t) => t.type === 'incoming').reduce((s, t) => s + t.usdValue, 0);
  const expenses = transactions.filter((t) => t.type === 'outgoing' || t.type === 'payment').reduce((s, t) => s + t.usdValue, 0);

  const quickActions = [
    { title: 'Send', description: 'Send MON to another wallet.', icon: ArrowUpRight, onClick: () => setSend(true) },
    { title: 'Receive', description: 'Receive MON into your wallet.', icon: ArrowDownLeft, onClick: () => setReceive(true) },
    { title: 'Swap', description: 'Swap MON for another token.', icon: Repeat2, onClick: () => setComingSoonType('swap') },
    { title: 'Convert', description: 'Convert to your local currency.', icon: DollarSign, onClick: () => setComingSoonType('convert') },
    { title: 'Transactions', description: 'View all on-chain activity.', icon: ArrowLeftRight, onClick: () => nav({ to: '/transactions' }) },
    { title: 'Analytics', description: 'Understand your financial activity.', icon: ChartNoAxesCombined, onClick: () => nav({ to: '/analytics' }) },
    { title: 'Create invoice', description: 'Request payment from a client.', icon: FilePlus2, onClick: () => nav({ to: '/invoices' }) },
    { title: 'AI Assistant', description: 'Ask questions about your wallet.', icon: Sparkles, onClick: () => nav({ to: '/assistant' }) },
  ];

  return (
    <div className="space-y-8">
      <Reveal>
        <PageIntro
          title="Wallet"
          description="Your live Monad embedded wallet."
          action={
            error ? (
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="size-4" /> Retry
              </Button>
            ) : undefined
          }
        />
      </Reveal>

      {/* Network banner */}
      <Reveal delay={40}>
        <NetworkBanner onMainnetClick={() => setMainnetDialog(true)} />
      </Reveal>

      {/* ── Balance hero ── */}
      <Reveal delay={60}>
        <section className="wallet-hero">
          {/* Left — balance info */}
          <div className="min-w-0">
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
                : '•••• MON'}
              {' '}· Monad Testnet
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-primary-foreground/70">
              <code className="rounded bg-black/20 px-1.5 py-0.5">{shorten(walletAddress, 10, 8)}</code>
              <IconButton label="Copy wallet address" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={copy}>
                <Copy className="size-4" />
              </IconButton>
              <IconButton label="Show QR code" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => setReceive(true)}>
                <QrCode className="size-4" />
              </IconButton>
            </div>
          </div>

          {/* Right — network switch + action buttons */}
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <NetworkSwitch onMainnet={() => setMainnetDialog(true)} />
            {/*
              Button pattern (alternating dark / purple):
              Send    = dark (secondary)   Receive = purple (primary)
              Swap    = purple (primary)   Convert = dark (secondary)
              2-col grid on small, single row on sm+
            */}
            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap">
              {/* Send — dark */}
              <Button variant="secondary" className="justify-center" onClick={() => setSend(true)}>
                <ArrowUpRight className="size-4" />
                Send
              </Button>
              {/* Receive — purple */}
              <Button className="justify-center" onClick={() => setReceive(true)}>
                <ArrowDownLeft className="size-4" />
                Receive
              </Button>
              {/* Swap — purple */}
              <Button className="justify-center" onClick={() => setComingSoonType('swap')}>
                <Repeat2 className="size-4" />
                Swap
              </Button>
              {/* Convert — dark */}
              <Button variant="secondary" className="justify-center" onClick={() => setComingSoonType('convert')}>
                <DollarSign className="size-4" />
                Convert
              </Button>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Stats ── */}
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

      {/* ── Assets ── */}
      <Reveal>
        <section>
          <div className="mb-4">
            <h2 className="section-title">Your assets</h2>
            <p className="section-subtitle">Native MON balance on Monad Testnet.</p>
          </div>
          {!monAsset ? (
            <div className="flex min-h-32 items-center justify-center border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No MON found. Visit{' '}
                <a href="https://faucet.monad.xyz" target="_blank" rel="noreferrer" className="text-primary underline">
                  faucet.monad.xyz
                </a>{' '}
                to get testnet tokens.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded border border-border bg-card">
              <div className="asset-row">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="asset-mark">M</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Monad</p>
                      <Info className="size-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">MON · Native · Monad Testnet</p>
                  </div>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="font-mono font-medium">
                    {visible ? monAsset.balance.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '••••'} MON
                  </p>
                  <p className="text-xs text-muted-foreground">{visible ? currency(monAsset.usdValue) : 'Hidden'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-primary">100%</p>
                  <p className="text-xs text-muted-foreground">of wallet</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </Reveal>

      {/* ── Wallet details panel ── */}
      <Reveal>
        <section className="panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="section-title">Wallet details</h2>
              <p className="section-subtitle">Your embedded Privy wallet on Monad.</p>
            </div>
            <Button variant="outline" size="sm" onClick={copy}>
              <Copy className="size-3.5" />
              Copy address
            </Button>
          </div>
          <div className="detail-list mt-4">
            <div><span>Network</span><strong>Monad Testnet</strong></div>
            <div><span>Chain ID</span><strong className="font-mono">10143</strong></div>
            <div><span>Wallet type</span><strong>Privy Embedded</strong></div>
            <div><span>Status</span><strong className="text-primary">Connected</strong></div>
            <div>
              <span>Full address</span>
              <strong className="max-w-[55%] break-all text-right font-mono text-xs">{walletAddress}</strong>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Recent transactions ── */}
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
            <TransactionList
              transactions={transactions as any}
              limit={5}
              onViewAll={() => nav({ to: '/transactions' })}
            />
          )}
        </section>
      </Reveal>

      {/* ── Dialogs ── */}
      <SendDialog open={send} onOpenChange={setSend} assets={assets} />
      <ReceiveDialog open={receive} onOpenChange={setReceive} />
      <ComingSoonDialog open={mainnetDialog} onClose={() => setMainnetDialog(false)} />

      {/* Swap / Convert coming soon */}
      <Dialog open={!!comingSoonType} onOpenChange={(o) => !o && setComingSoonType(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
              {comingSoonType === 'swap'
                ? <Repeat2 className="size-7 text-primary" />
                : <DollarSign className="size-7 text-primary" />}
            </div>
            <DialogTitle className="text-center text-xl">
              {comingSoonType === 'swap' ? 'Swap' : 'Convert'} — Coming on Mainnet
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed">
              {comingSoonType === 'swap'
                ? 'Swap MON for other tokens directly from your Plynt wallet. This feature launches with Monad Mainnet.'
                : 'Convert your MON balance to your local currency. This feature launches with Monad Mainnet.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-1 space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 opacity-50">
              {comingSoonType === 'swap'
                ? <Repeat2 className="size-4 text-muted-foreground" />
                : <DollarSign className="size-4 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">{comingSoonType === 'swap' ? 'Token Swap' : 'Currency Convert'}</p>
                <p className="text-xs text-muted-foreground">Available on Mainnet</p>
              </div>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3" /> Soon
              </span>
            </div>
            <Button className="w-full" onClick={() => setComingSoonType(null)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
