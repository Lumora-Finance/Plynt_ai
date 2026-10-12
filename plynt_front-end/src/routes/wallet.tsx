import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Copy, Eye, EyeOff, Globe, Info, Loader2, QrCode, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageIntro, IconButton, currency, shorten } from '@/components/shared/common';
import { CountUp, Reveal } from '@/components/shared/motion';
import { ReceiveDialog, SendDialog, WalletActionButtons } from '@/components/wallet/wallet-flows';
import { useWalletData } from '@/hooks/use-wallet-data';
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

function NetworkSwitch({ onMainnet }: { onMainnet: () => void }) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-full border border-border bg-muted/40 p-0.5 text-xs font-medium">
      <span className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-primary-foreground">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Testnet
      </span>
      <button
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
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

function WalletPage() {
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(VISIBILITY_KEY) !== 'false'; } catch { return true; }
  });
  const [send, setSend] = useState(false);
  const [receive, setReceive] = useState(false);
  const [mainnetDialog, setMainnetDialog] = useState(false);
  const { data, loading, error, address, refetch } = useWalletData();

  // Persist + broadcast visibility changes
  useEffect(() => {
    try { localStorage.setItem(VISIBILITY_KEY, String(visible)); } catch { /* ignore */ }
  }, [visible]);

  // Sync when another tab/page changes the value
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

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;
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

  return (
    <div className="space-y-8">
      <Reveal>
        <PageIntro
          title="Wallet"
          description="Your live Monad embedded wallet."
          action={
            <div className="flex items-center gap-2">
              {error && <Button variant="outline" size="sm" onClick={refetch}><RefreshCw className="size-4" /> Retry</Button>}
              <NetworkSwitch onMainnet={() => setMainnetDialog(true)} />
            </div>
          }
        />
      </Reveal>

      {/* Balance hero */}
      <Reveal delay={60}>
        <section className="wallet-hero">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm text-primary-foreground/70">Total balance</p>
              <IconButton label={visible ? 'Hide balance' : 'Show balance'} className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => setVisible((v) => !v)}>
                {visible ? <EyeOff /> : <Eye />}
              </IconButton>
            </div>
            <p className="mt-2 text-4xl font-semibold md:text-5xl">
              {visible ? <CountUp value={totalBalance} prefix="$" decimals={2} /> : '••••••'}
            </p>
            <p className="mt-2 font-mono text-lg text-primary-foreground/80">
              {visible
                ? `${(monAsset?.balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} MON`
                : '•••• MON'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-primary-foreground/70">
              <code>{shorten(walletAddress, 10, 8)}</code>
              <IconButton label="Copy wallet address" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={copy}><Copy /></IconButton>
              <IconButton label="Show QR code" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => setReceive(true)}><QrCode /></IconButton>
            </div>
          </div>
          <WalletActionButtons onSend={() => setSend(true)} onReceive={() => setReceive(true)} />
        </section>
      </Reveal>

      {/* Assets — MON only */}
      <Reveal>
        <section>
          <div className="mb-4">
            <h2 className="section-title">Your assets</h2>
            <p className="section-subtitle">Native MON balance on Monad Testnet.</p>
          </div>
          {!monAsset ? (
            <div className="flex min-h-32 items-center justify-center border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">No MON found. Visit <a href="https://faucet.monad.xyz" target="_blank" rel="noreferrer" className="text-primary underline">faucet.monad.xyz</a> to get testnet tokens.</p>
            </div>
          ) : (
            <div className="overflow-hidden border border-border bg-card">
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

      {/* Wallet details */}
      <Reveal>
        <section className="panel">
          <h2 className="section-title">Wallet details</h2>
          <div className="detail-list mt-5">
            <div><span>Network</span><strong>Monad Testnet</strong></div>
            <div><span>Chain ID</span><strong className="font-mono">10143</strong></div>
            <div><span>Wallet type</span><strong>Privy Embedded</strong></div>
            <div><span>Connection</span><strong className="text-primary">Connected</strong></div>
            <div><span>Full address</span><strong className="max-w-[60%] break-all text-right font-mono text-xs">{walletAddress}</strong></div>
          </div>
        </section>
      </Reveal>

      <SendDialog open={send} onOpenChange={setSend} assets={assets} />
      <ReceiveDialog open={receive} onOpenChange={setReceive} />
      <ComingSoonDialog open={mainnetDialog} onClose={() => setMainnetDialog(false)} />
    </div>
  );
}
