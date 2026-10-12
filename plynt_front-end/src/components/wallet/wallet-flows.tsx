import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, Coins, Copy, Fuel, Loader2, QrCode, Share2, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useSendTransaction } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePrivyUser } from '@/hooks/use-privy-user';
import type { AssetSymbol, TransactionDraft } from '@/types';
import { shorten } from '@/components/shared/common';
import type { WalletAsset } from '@/hooks/use-wallet-data';

// Monad Testnet token contract addresses
const TOKEN_CONTRACTS: Record<string, string> = {
  USDC: '0x534b2f3A21130d7a60830c2Df862319e593943A3', // Circle official
};

// Simple ERC20 transfer ABI encoding
function encodeERC20Transfer(to: string, amountWei: bigint): string {
  // transfer(address,uint256) = 0xa9059cbb
  const paddedTo = to.slice(2).padStart(64, '0');
  const paddedAmount = amountWei.toString(16).padStart(64, '0');
  return '0xa9059cbb' + paddedTo + paddedAmount;
}

function QrPattern({ address }: { address: string }) {
  // Generate a deterministic-ish pattern from address characters
  const seed = address.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (
    <div aria-label="QR code for wallet address" className="qr-pattern grid aspect-square w-44 grid-cols-9 gap-1 border-8 border-card bg-card p-2">
      {Array.from({ length: 81 }).map((_, i) => (
        <span key={i} className={((i * 7 + seed + i % 5) % 3 === 0) ? 'bg-foreground' : 'bg-transparent'} />
      ))}
    </div>
  );
}

export function ReceiveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { walletAddress } = usePrivyUser();
  const address = walletAddress ?? '';

  const copy = () => {
    if (address) {
      navigator.clipboard?.writeText(address);
      toast.success('Wallet address copied');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive assets</DialogTitle>
          <DialogDescription>Share your Monad embedded wallet address to receive assets.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-5 py-3">
          {address ? (
            <>
              <QrPattern address={address} />
              <code className="w-full break-all border border-border bg-muted p-3 text-center text-xs">
                {address}
              </code>
              <div className="flex gap-2">
                <Button onClick={copy}>
                  <Copy /> Copy address
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(address);
                    toast('Address copied for sharing');
                  }}
                >
                  <Share2 /> Share
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No wallet address found. Please sign in.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SendDialog({
  open,
  onOpenChange,
  initialDraft,
  assets = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDraft?: TransactionDraft;
  assets?: WalletAsset[];
}) {
  const [step, setStep] = useState<'form' | 'review' | 'done'>('form');
  const [recipient, setRecipient] = useState(
    initialDraft?.recipient === 'Recipient address required' ? '' : (initialDraft?.recipient ?? ''),
  );
  const [amount, setAmount] = useState(initialDraft?.amount?.toString() ?? '');
  const [asset, setAsset] = useState<AssetSymbol>(initialDraft?.asset ?? 'MON');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [sending, setSending] = useState(false);
  const { sendTransaction } = useSendTransaction();

  const fee = 0.00001;
  const MONAD_CHAIN_ID = 10143;

  const submit = async () => {
    if (recipient.length < 20 || !recipient.startsWith('0x')) {
      setError('Enter a valid Monad wallet address (0x…).');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setError('');
    setStep('review');
  };

  const confirm = async () => {
    setSending(true);
    try {
      let hash: string | undefined;

      if (asset === 'MON') {
        // Native MON transfer
        const valueWei = BigInt(Math.round(Number(amount) * 1e18));
        const result = await sendTransaction({
          to: recipient as `0x${string}`,
          value: valueWei,
          chainId: MONAD_CHAIN_ID,
        });
        hash = result?.hash;
      } else {
        // ERC20 transfer
        const contractAddress = TOKEN_CONTRACTS[asset];
        if (!contractAddress) throw new Error('Unsupported token');
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
      toast.success('Transaction sent!', { description: hash ? `Tx: ${hash.slice(0, 16)}…` : undefined });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transaction failed';
      setError(msg);
      toast.error('Transaction failed', { description: msg });
    } finally {
      setSending(false);
    }
  };

  const close = (value: boolean) => {
    onOpenChange(value);
    if (!value) setTimeout(() => { setStep('form'); setError(''); setTxHash(''); }, 200);
  };

  const availableAssets = assets.length > 0 ? assets : [
    { symbol: 'MON', balance: 0 },
    { symbol: 'USDC', balance: 0 },
    { symbol: 'WETH', balance: 0 },
  ];
  const selectedAsset = availableAssets.find((a) => a.symbol === asset);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === 'form' ? 'Send assets' : step === 'review' ? 'Review transaction' : 'Transaction sent'}
          </DialogTitle>
          <DialogDescription>
            {step === 'form'
              ? 'Send MON or tokens on Monad Testnet.'
              : step === 'review'
              ? 'Confirm every detail before broadcasting.'
              : 'Your transaction has been broadcast to Monad.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipient">Recipient address</Label>
              <Input
                id="recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-[1fr_130px] gap-3">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Asset</Label>
                <Select value={asset} onValueChange={(v) => setAsset(v as AssetSymbol)}>
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
            <div>
              <Label htmlFor="memo">Memo</Label>
              <Input
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Optional reference"
                className="mt-1.5"
              />
            </div>
            <div className="detail-list compact">
              <div>
                <span>Available balance</span>
                <strong>
                  {selectedAsset?.balance != null
                    ? selectedAsset.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })
                    : '—'}{' '}
                  {asset}
                </strong>
              </div>
              <div><span>Network fee</span><strong>{fee} MON (est.)</strong></div>
              <div><span>Estimated arrival</span><strong>~1 second</strong></div>
            </div>
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
            <Button className="w-full" onClick={submit}>
              Review transaction
            </Button>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="review-row"><UserRound /><span>Recipient</span><strong>{shorten(recipient, 8, 7)}</strong></div>
            <div className="review-row"><Coins /><span>Amount</span><strong>{Number(amount).toLocaleString()} {asset}</strong></div>
            <div className="review-row"><Fuel /><span>Network fee</span><strong>~{fee} MON</strong></div>
            <div className="review-row"><ShieldCheck /><span>Network</span><strong>Monad Testnet</strong></div>
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('form')}>Back</Button>
              <Button onClick={confirm} disabled={sending}>
                {sending ? <><Loader2 className="size-4 animate-spin" /> Sending…</> : 'Confirm & send'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-secondary text-primary">
              <Check className="size-7" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">Transaction sent!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your transaction has been broadcast to Monad Testnet.
            </p>
            {txHash && (
              <a
                href={`https://testnet.monadscan.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 text-xs text-primary underline-offset-4 hover:underline"
              >
                View on Monadscan →
              </a>
            )}
            <Button className="mt-6" onClick={() => close(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function WalletActionButtons({ onSend, onReceive }: { onSend: () => void; onReceive: () => void }) {
  return (
    <div className="flex gap-2">
      <Button onClick={onSend}><ArrowUpRight className="size-4" />Send</Button>
      <Button variant="outline" onClick={onReceive}><ArrowDownLeft className="size-4" />Receive</Button>
    </div>
  );
}
