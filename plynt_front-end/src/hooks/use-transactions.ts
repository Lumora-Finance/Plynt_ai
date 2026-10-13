// src/hooks/use-transactions.ts
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useCallback, useEffect, useState } from 'react';
import { useProfile } from './use-profile';
import {
  fetchTransactions,
  recordTransaction,
  txHashExists,
  calcPlatformFee,
  PLATFORM_FEE_RATE,
  type TransactionRow,
} from '@/services/transactionService';
import { createNotification } from '@/services/notificationService';

export type { TransactionRow };
export { PLATFORM_FEE_RATE, calcPlatformFee };

const MONAD_RPC = 'https://testnet-rpc.monad.xyz';
const MONAD_EXPLORER = 'https://testnet.monadscan.com';

const ERC20_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  '0x534b2f3a21130d7a60830c2df862319e593943a3': { symbol: 'USDC', decimals: 6 },
};
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const PRICES: Record<string, number> = { MON: 0.189, USDC: 1.0, WETH: 1950 };
function usdOf(amount: number, symbol: string) { return amount * (PRICES[symbol] ?? 0); }

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(MONAD_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

function shorten(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

/** Shape exposed by the hook — extends DB row with display helpers */
export interface OnChainTransaction extends TransactionRow {
  // aliases for existing UI compatibility
  id: string;
  type: "incoming" | "outgoing" | "gift" | "invoice" | "swap" | "convert";
  hash: string;
  counterparty: string;
  asset: string;
  amount: number;
  usdValue: number;
  status: "pending" | "confirmed" | "failed";
  timestamp: string;
  memo: string;
  fee: number;
  explorerUrl: string;
}

function rowToTx(r: TransactionRow): OnChainTransaction {
  return {
    ...r,
    hash: r.tx_hash ?? '',
    usdValue: r.usd_value,
    timestamp: r.created_at,
    memo: r.memo ?? '',
    fee: 0,
    explorerUrl: r.explorer_url ?? '',
  };
}

export function useTransactions() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { profile } = useProfile();

  const [transactions, setTransactions] = useState<OnChainTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
  const address = embeddedWallet?.address;
  const profileId = profile?.id;

  // ── Load from DB ────────────────────────────────────────────────────────────
  const loadFromDB = useCallback(async () => {
    if (!profileId) return;
    const rows = await fetchTransactions(profileId);
    setTransactions(rows.map(rowToTx));
  }, [profileId]);

  useEffect(() => {
    if (ready && authenticated && profileId) loadFromDB();
  }, [ready, authenticated, profileId, loadFromDB]);

  // ── Sync on-chain → DB ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!address || !profileId) return;
    let cancelled = false;

    async function syncOnChain() {
      if (!address || !profileId) return;
      setLoading(true);
      setError(null);

      try {
        const addrLower = address.toLowerCase();
        const latestHex: string = await rpc('eth_blockNumber', []);
        const latest = parseInt(latestHex, 16);

        // ── Native MON (last 100 blocks) ──────────────────────────────────
        const from = Math.max(0, latest - 100);
        const blockNums = Array.from({ length: latest - from + 1 }, (_, i) => from + i);

        const blockResults = await Promise.allSettled(
          blockNums.map((n) => rpc('eth_getBlockByNumber', ['0x' + n.toString(16), true])),
        );

        const toRecord: Parameters<typeof recordTransaction>[0][] = [];

        for (const result of blockResults) {
          if (result.status !== 'fulfilled' || !result.value?.transactions) continue;
          const block = result.value;
          const ts = new Date(parseInt(block.timestamp, 16) * 1000).toISOString();

          for (const tx of block.transactions) {
            const fromLower = (tx.from as string)?.toLowerCase();
            const toLower = (tx.to as string)?.toLowerCase();
            if (fromLower !== addrLower && toLower !== addrLower) continue;

            const isERC20 = toLower && toLower in ERC20_TOKENS;
            const hasInput = tx.input && tx.input !== '0x';
            if (isERC20 && hasInput) continue;

            const isOut = fromLower === addrLower;
            const amount = Number(BigInt(tx.value as string)) / 1e18;
            if (amount === 0) continue;

            const alreadyExists = await txHashExists(profileId, tx.hash as string);
            if (alreadyExists) continue;

            const fee = isOut ? calcPlatformFee(amount) : 0;
            toRecord.push({
              profileId,
              txHash: tx.hash as string,
              type: isOut ? 'outgoing' : 'incoming',
              counterparty: isOut ? shorten(tx.to as string ?? '') : shorten(tx.from as string),
              fromAddress: tx.from as string,
              toAddress: tx.to as string ?? '',
              asset: 'MON',
              amount,
              usdValue: usdOf(amount, 'MON'),
              platformFee: fee,
              status: 'confirmed',
              memo: hasInput ? 'Contract interaction' : '',
              explorerUrl: `${MONAD_EXPLORER}/tx/${tx.hash}`,
            });
          }
        }

        // ── ERC20 events (last 2000 blocks) ──────────────────────────────
        const logFrom = Math.max(0, latest - 2000);
        const LOG_BATCH = 100;
        const pad = (a: string) => '0x' + a.slice(2).padStart(64, '0');
        const ranges: [number, number][] = [];
        for (let s = logFrom; s <= latest; s += LOG_BATCH) {
          ranges.push([s, Math.min(s + LOG_BATCH - 1, latest)]);
        }

        const erc20Logs: any[] = [];
        const CONC = 10;
        for (let i = 0; i < ranges.length; i += CONC) {
          const batch = ranges.slice(i, i + CONC);
          const results = await Promise.allSettled(
            batch.flatMap(([f, t]) => {
              const fh = '0x' + f.toString(16);
              const th = '0x' + t.toString(16);
              return [
                rpc('eth_getLogs', [{ fromBlock: fh, toBlock: th, topics: [TRANSFER_TOPIC, pad(address)] }]),
                rpc('eth_getLogs', [{ fromBlock: fh, toBlock: th, topics: [TRANSFER_TOPIC, null, pad(address)] }]),
              ];
            }),
          );
          for (const r of results) {
            if (r.status === 'fulfilled' && Array.isArray(r.value)) erc20Logs.push(...r.value);
          }
        }

        // Fetch block timestamps for ERC20 logs
        const uniqueBlocks = [...new Set(erc20Logs.map((l: any) => l.blockNumber as string))];
        const btsMap = new Map<string, string>();
        await Promise.allSettled(
          uniqueBlocks.map(async (bh) => {
            const b = await rpc('eth_getBlockByNumber', [bh, false]);
            if (b?.timestamp) btsMap.set(bh, new Date(parseInt(b.timestamp, 16) * 1000).toISOString());
          }),
        );

        for (const log of erc20Logs) {
          const token = ERC20_TOKENS[(log.address as string).toLowerCase()];
          if (!token) continue;
          const fromAddr = '0x' + (log.topics[1] as string).slice(26);
          const toAddr = '0x' + (log.topics[2] as string).slice(26);
          const isOut = fromAddr.toLowerCase() === addrLower;
          const amount = Number(BigInt(log.data as string)) / 10 ** token.decimals;
          const txHash = log.transactionHash as string;

          const alreadyExists = await txHashExists(profileId, txHash);
          if (alreadyExists) continue;

          const fee = isOut ? calcPlatformFee(amount) : 0;
          toRecord.push({
            profileId,
            txHash,
            type: isOut ? 'outgoing' : 'incoming',
            counterparty: isOut ? shorten(toAddr) : shorten(fromAddr),
            fromAddress: fromAddr,
            toAddress: toAddr,
            asset: token.symbol,
            amount,
            usdValue: usdOf(amount, token.symbol),
            platformFee: fee,
            status: 'confirmed',
            memo: '',
            explorerUrl: `${MONAD_EXPLORER}/tx/${txHash}`,
          });
        }

        // Record new transactions + fire notifications for each
        if (!cancelled && toRecord.length > 0) {
          await Promise.allSettled(
            toRecord.map(async (t) => {
              const row = await recordTransaction(t);
              if (!row) return;

              // Notification
              const dir = t.type === 'incoming' ? 'Received' : 'Sent';
              const amt = `${t.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${t.asset}`;
              await createNotification(
                profileId,
                `${dir} ${amt}`,
                `${dir} ${amt} ${t.type === 'incoming' ? 'from' : 'to'} ${t.counterparty}`,
                t.type === 'incoming' ? 'success' : 'info',
              );
            }),
          );
          if (!cancelled) await loadFromDB();
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to sync transactions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    syncOnChain();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, profileId]);

  return { transactions, loading, error, address };
}
