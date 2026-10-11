import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Copy, Eye, EyeOff, Info, Loader2, QrCode, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageIntro, IconButton, currency, shorten } from '@/components/shared/common';
import { CountUp, Reveal } from '@/components/shared/motion';
import { ReceiveDialog, SendDialog, WalletActionButtons } from '@/components/wallet/wallet-flows';
import { useWalletData } from '@/hooks/use-wallet-data';

export const Route = createFileRoute('/wallet')({
  head: () => ({
    meta: [
      { title: 'Wallet — PLYNT' },
      { name: 'description', content: 'Manage your Monad assets with live balances.' },
      { property: 'og:title', content: 'Wallet — PLYNT' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const [visible, setVisible] = useState(true);
  const [send, setSend] = useState(false);
  const [receive, setReceive] = useState(false);
  const { data, loading, error, address, refetch } = useWalletData();

  const copy = () => {
    if (address) {
      navigator.clipboard?.writeText(address);
      toast.success('Wallet address copied');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
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
  const network = data?.network ?? 'Monad Testnet';

  return (
    <div className="space-y-8">
      <Reveal>
        <PageIntro title="Wallet" description="Your live Monad embedded wallet balances." action={
          error ? (
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="size-4" /> Retry
            </Button>
          ) : undefined
        } />
      </Reveal>

      <Reveal delay={60}>
        <section className="wallet-hero">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm text-primary-foreground/70">Total balance</p>
              <IconButton
                label={visible ? 'Hide balance' : 'Show balance'}
                className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff /> : <Eye />}
              </IconButton>
            </div>
            <p className="mt-2 text-4xl font-semibold md:text-5xl">
              {visible ? <CountUp value={totalBalance} prefix="$" decimals={2} /> : '••••••'}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-primary-foreground/70">
              <code>{shorten(walletAddress, 10, 8)}</code>
              <IconButton
                label="Copy wallet address"
                className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={copy}
              >
                <Copy />
              </IconButton>
              <IconButton
                label="Show QR code"
                className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={() => setReceive(true)}
              >
                <QrCode />
              </IconButton>
            </div>
          </div>
          <WalletActionButtons onSend={() => setSend(true)} onReceive={() => setReceive(true)} />
        </section>
      </Reveal>

      <Reveal>
        <section>
          <div className="mb-4">
            <h2 className="section-title">Your assets</h2>
            <p className="section-subtitle">Live balances on Monad Testnet.</p>
          </div>
          {assets.length === 0 ? (
            <div className="flex min-h-32 items-center justify-center border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">No assets found. Your wallet is empty on Monad Testnet.</p>
            </div>
          ) : (
            <div className="overflow-hidden border border-border bg-card">
              {assets.map((asset, i) => (
                <div key={asset.id} className="asset-row" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="asset-mark">{asset.symbol.slice(0, 1)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{asset.name}</p>
                        <Info className="size-3.5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {asset.symbol} · {asset.issuer}
                      </p>
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="font-mono font-medium">
                      {visible ? asset.balance.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '••••'}{' '}
                      {asset.symbol}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {visible ? currency(asset.usdValue) : 'Hidden'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-muted-foreground">—</p>
                    <p className="text-xs text-muted-foreground">{asset.allocation}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      <Reveal>
        <section className="panel">
          <h2 className="section-title">Wallet details</h2>
          <div className="detail-list mt-5">
            <div><span>Network</span><strong>{network}</strong></div>
            <div><span>Wallet type</span><strong>Privy Embedded</strong></div>
            <div><span>Connection</span><strong className="text-primary">Connected</strong></div>
            <div>
              <span>Full address</span>
              <strong className="max-w-[60%] break-all text-right font-mono text-xs">{walletAddress}</strong>
            </div>
          </div>
        </section>
      </Reveal>

      <SendDialog open={send} onOpenChange={setSend} assets={assets} />
      <ReceiveDialog open={receive} onOpenChange={setReceive} />
    </div>
  );
}
