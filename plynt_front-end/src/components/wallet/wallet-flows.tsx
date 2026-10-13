import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Coins,
  Copy,
  DollarSign,
  ExternalLink,
  Fuel,
  Loader2,
  Repeat2,
  Share2,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSendTransaction, useFundWallet } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePrivyUser } from '@/hooks/use-privy-user';
import { useProfile } from '@/hooks/use-profile';
import { monadTestnet } from '@/lib/privy';
import { recordTransaction, calcPlatformFee, PLATFORM_FEE_RATE } from '@/services/transactionService';
import { createNotification } from '@/services/notificationService';
import type { AssetSymbol, TransactionDraft } from '@/types';
import { shorten } from '@/components/shared/common';
import type { WalletAsset } from '@/hooks/use-wallet-data';

// ─── Token contracts ──────────────────────────────────────────────────────────
const TOKEN_CONTRACTS: Record<string, string> = {
  USDC: '0x534b2f3A21130d7a60830c2Df862319e593943A3',
};

function encodeERC20Transfer(to: string, amountWei: bigint): string {
  const paddedTo = to.slice(2).padStart(64, '0');
  const paddedAmount = amountWei.toString(16).padStart(64, '0');
  return '0xa9059cbb' + paddedTo + paddedAmount;
}

// ─── Real QR code component ────────────────────────────────────────────────────
function QRCode({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    let cancelled = false;

    import('qrcode').then((QR: any) => {
      if (cancelled || !canvasRef.current) return;
      QR.toCanvas(canvasRef.current, value, {
        width: 180,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }, (err: any) => {
        if (!cancelled && !err) setReady(true);
      });
    });

    return () => { cancelled = true; };
  }, [value]);

  return (
    <div className="flex items-center justify-center rounded-lg border border-border bg-white p-2">
      <canvas
        ref={canvasRef}
        className={ready ? 'block' : 'hidden'}
        aria-label="QR code for wallet address"
      />
      {!ready && (
        <div className="flex size-[180px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// ─── ReceiveDialog ─────────────────────────────────────────────────────────────
export function ReceiveDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { walletAddress } = usePrivyUser();
  const { fundWallet } = useFundWallet();
  const address = walletAddress ?? '';

  const copy = () => {
    if (!address) return;
    navigator.clipboard?.writeText(address);
    toast.success('Wallet address copied');
  };

  const share = async () => {
    if (!address) return;
    if (navigator.share) {
      await navigator.share({ title: 'My Monad Wallet', text: address });
    } else {
      navigator.clipboard?.writeText(address);
      toast('Address copied for sharing');
    }
  };

  const handleFund = async () => {
    if (!address) return;
    try {
      await fundWallet({ address, options: { chain: monadTestnet } });
    } catch {
      toast.error('Could not open funding modal');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownLeft className="size-5 text-primary" />
            Receive assets
          </DialogTitle>
          <DialogDescription>
            Share your Monad embedded wallet address to receive MON or tokens.
          </DialogDescription>
        </DialogHeader>

        {address ? (
          <div className="flex flex-col items-center gap-4 py-2">
            {/* Real QR code */}
            <QRCode value={address} />

            {/* Address display */}
            <div className="w-full">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Wallet address</p>
              <code className="block w-full break-all rounded-md border border-border bg-muted px-3 py-2.5 text-center text-xs leading-relaxed">
                {address}
              </code>
            </div>

            {/* Network badge */}
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary">
              <Wallet className="size-3" />
              Monad Testnet · Privy Embedded Wallet
            </div>

            {/* Action buttons */}
            <div className="flex w-full gap-2">
              <Button className="flex-1" onClick={copy}>
                <Copy className="size-4" />
                Copy address
              </Button>
              <Button variant="outline" onClick={share}>
                <Share2 className="size-4" />
                Share
              </Button>
            </div>

            {/* Fund with Privy */}
            <div className="w-full border-t border-border pt-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Need testnet MON? Use the faucet or fund via MoonPay:
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleFund}>
                  Fund wallet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open('https://faucet.monad.xyz', '_blank')}
                >
                  <ExternalLink className="size-3" />
                  Monad Faucet
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No wallet found. Please sign in to see your address.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── SendDialog ────────────────────────────────────────────────────────────────
export function SendDialog({
  open,
  onOpenChange,
  initialDraft,
  assets = [],
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDraft?: TransactionDraft;
  assets?: WalletAsset[];
  onSuccess?: () => void;
}) {
  const [step, setStep] = useState<'form' | 'review' | 'sending' | 'done' | 'error'>('form');
  const [recipient, setRecipient] = useState(
    initialDraft?.recipient && initialDraft.recipient !== 'Recipient address required'
      ? initialDraft.recipient
      : '',
  );
  const [amount, setAmount] = useState(initialDraft?.amount?.toString() ?? '');
  const [asset, setAsset] = useState<AssetSymbol>(initialDraft?.asset ?? 'MON');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const { sendTransaction } = useSendTransaction();
  const { walletAddress } = usePrivyUser();
  const { profile } = useProfile();

  const MONAD_CHAIN_ID = 10143;

  // Platform fee: 0.6% of amount
  const platformFee = amount && !isNaN(Number(amount)) ? calcPlatformFee(Number(amount)) : 0;

  const availableAssets =
    assets.length > 0
      ? assets
      : [
          { symbol: 'MON', balance: 0 },
        ];

  const selectedAsset = availableAssets.find((a) => a.symbol === asset);

  const validate = () => {
    if (!recipient.startsWith('0x') || recipient.length < 42) {
      setError('Enter a valid Monad wallet address (0x… 42 characters).');
      return false;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Enter an amount greater than zero.');
      return false;
    }
    const balance = selectedAsset && 'balance' in selectedAsset ? (selectedAsset as WalletAsset).balance : 0;
    if (balance > 0 && Number(amount) > balance) {
      setError(`Insufficient balance. You have ${balance.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${asset}.`);
      return false;
    }
    setError('');
    return true;
  };

  const submit = () => {
    if (validate()) setStep('review');
  };

  const confirm = async () => {
    setStep('sending');
    setError('');
    try {
      let hash: string | undefined;

      if (asset === 'MON') {
        const valueWei = BigInt(Math.round(Number(amount) * 1e18));
        const result = await sendTransaction({
          to: recipient as `0x${string}`,
          value: valueWei,
          chainId: MONAD_CHAIN_ID,
        });
        hash = result?.hash;
      } else {
        const contractAddress = TOKEN_CONTRACTS[asset];
        if (!contractAddress) throw new Error(`${asset} is not supported on this network.`);
        const decimals = asset === 'USDC' ? 6 : 18;
        const amountWei = BigInt(Math.round(Number(amount) * 10 ** decimals));
        const result = await sendTransaction({
          to: contractAddress as `0x${string}`,
          data: encodeERC20Transfer(recipient, amountWei) as `0x${string}`,
          chainId: MONAD_CHAIN_ID,
        });
        hash = result?.hash;
      }

      if (hash) setTxHash(hash);
      setStep('done');
      toast.success('Transaction sent!', {
        description: hash ? `Tx: ${hash.slice(0, 10)}…${hash.slice(-6)}` : undefined,
      });

      // ── Persist to DB + fire notification ────────────────────────────────
      if (profile?.id) {
        const PRICES: Record<string, number> = { MON: 0.189, USDC: 1.0, WETH: 1950 };
        const numAmount = Number(amount);
        const usdValue = numAmount * (PRICES[asset] ?? 0);
        const recipientShort = recipient.slice(0, 6) + '…' + recipient.slice(-4);

        await recordTransaction({
          profileId: profile.id,
          txHash: hash ?? undefined,
          type: 'outgoing',
          counterparty: recipientShort,
          fromAddress: walletAddress ?? undefined,
          toAddress: recipient,
          asset,
          amount: numAmount,
          usdValue,
          platformFee,
          status: 'confirmed',
          explorerUrl: hash ? `https://testnet.monadscan.com/tx/${hash}` : undefined,
        });

        await createNotification(
          profile.id,
          `Sent ${numAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${asset}`,
          `Sent to ${recipientShort}. Platform fee: ${platformFee.toFixed(6)} ${asset} (${(PLATFORM_FEE_RATE * 100).toFixed(1)}%).`,
          'info',
        );

        // Notify parent to reload transactions + notifications immediately
        onSuccess?.();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transaction failed';
      const friendly = msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('denied')
        ? 'Transaction cancelled.'
        : msg;
      setError(friendly);
      setStep('error');
      toast.error('Transaction failed', { description: friendly });
    }
  };

  const reset = () => {
    setStep('form');
    setError('');
    setTxHash('');
  };

  const close = (value: boolean) => {
    onOpenChange(value);
    if (!value) setTimeout(reset, 200);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="size-5 text-primary" />
            {step === 'form' && 'Send assets'}
            {step === 'review' && 'Review transaction'}
            {step === 'sending' && 'Sending…'}
            {step === 'done' && 'Transaction sent!'}
            {step === 'error' && 'Transaction failed'}
          </DialogTitle>
          <DialogDescription>
            {step === 'form' && 'Send MON or USDC on Monad Testnet via your Privy wallet.'}
            {step === 'review' && 'Check every detail — transactions on Monad are irreversible.'}
            {step === 'sending' && 'Signing and broadcasting via your Privy embedded wallet…'}
            {step === 'done' && 'Your transaction has been broadcast to Monad Testnet.'}
            {step === 'error' && 'Something went wrong. You can try again.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── Form ── */}
        {step === 'form' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="send-recipient">Recipient address</Label>
              <Input
                id="send-recipient"
                value={recipient}
                onChange={(e) => { setRecipient(e.target.value); setError(''); }}
                placeholder="0x…"
                className="mt-1.5 font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-[1fr_130px] gap-3">
              <div>
                <Label htmlFor="send-amount">Amount</Label>
                <Input
                  id="send-amount"
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(''); }}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Asset</Label>
                <Select value={asset} onValueChange={(v) => { setAsset(v as AssetSymbol); setError(''); }}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAssets.map((a) => (
                      <SelectItem key={a.symbol} value={a.symbol}>
                        {a.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Balance info */}
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available balance</span>
                <span className="font-mono font-medium">
                  {selectedAsset && 'balance' in selectedAsset
                    ? (selectedAsset as WalletAsset).balance.toLocaleString(undefined, { maximumFractionDigits: 6 })
                    : '—'}{' '}
                  {asset}
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Platform fee ({(PLATFORM_FEE_RATE * 100).toFixed(1)}%)</span>
                <span className="font-mono">{platformFee > 0 ? `${platformFee.toFixed(6)} ${asset}` : '—'}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium text-primary">Monad Testnet</span>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button className="w-full" onClick={submit}>
              Review transaction
            </Button>
          </div>
        )}

        {/* ── Review ── */}
        {step === 'review' && (
          <div className="space-y-4">
            <div className="divide-y divide-border rounded-md border border-border bg-muted/30">
              {[
                { icon: UserRound, label: 'To', value: shorten(recipient, 10, 8) },
                { icon: Coins, label: 'Amount', value: `${Number(amount).toLocaleString()} ${asset}` },
                { icon: Fuel, label: `Platform fee (${(PLATFORM_FEE_RATE * 100).toFixed(1)}%)`, value: `${platformFee.toFixed(6)} ${asset}` },
                { icon: ShieldCheck, label: 'Network', value: 'Monad Testnet' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="size-4" />
                    {label}
                  </span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
              This transaction will be signed by your Privy embedded wallet and broadcast to Monad Testnet. It cannot be reversed.
            </div>

            {error && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('form')}>
                Back
              </Button>
              <Button onClick={confirm}>
                Confirm &amp; send
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Sending ── */}
        {step === 'sending' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <div className="size-16 animate-spin rounded-full border-4 border-muted border-t-primary" />
              <Wallet className="absolute inset-0 m-auto size-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">Waiting for Privy confirmation…</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check the Privy wallet prompt to confirm the transaction.
              </p>
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-secondary text-primary">
              <Check className="size-7" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">Transaction sent!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {Number(amount).toLocaleString()} {asset} → {shorten(recipient, 8, 6)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Broadcast to Monad Testnet via Privy</p>
            {txHash && (
              <a
                href={`https://testnet.monadscan.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
              >
                <ExternalLink className="size-3" />
                View on Monadscan
              </a>
            )}
            <Button className="mt-6 w-full" onClick={() => close(false)}>
              Done
            </Button>
          </div>
        )}

        {/* ── Error ── */}
        {step === 'error' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive">
              <span className="text-2xl font-bold">!</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold">Transaction failed</h3>
            {error && (
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">{error}</p>
            )}
            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={() => close(false)}>
                Close
              </Button>
              <Button onClick={() => setStep('review')}>
                Try again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── WalletActionButtons ───────────────────────────────────────────────────────
export function WalletActionButtons({
  onSend,
  onReceive,
  onSwap,
  onConvert,
}: {
  onSend: () => void;
  onReceive: () => void;
  onSwap?: () => void;
  onConvert?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onSend}>
        <ArrowUpRight className="size-4" />
        Send
      </Button>
      <Button variant="outline" onClick={onReceive}>
        <ArrowDownLeft className="size-4" />
        Receive
      </Button>
      {onSwap && (
        <Button variant="outline" onClick={onSwap}>
          <Repeat2 className="size-4" />
          Swap
        </Button>
      )}
      {onConvert && (
        <Button variant="outline" onClick={onConvert}>
          <DollarSign className="size-4" />
          Convert
        </Button>
      )}
    </div>
  );
}
