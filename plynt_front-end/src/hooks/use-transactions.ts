// src/hooks/use-transactions.ts
//
// Strategy:
//  1. Load instantly from DB (zero RPC calls, shown immediately)
//  2. Defer on-chain sync by 5 s after mount so Privy auth completes first
//  3. Use eth_getLogs for EVERYTHING (no per-block fetch) — 2 RPC calls total for native
//  4. Bulk-check already-recorded tx hashes in one DB query, not N queries
//  5. Sequential inserts with a small delay to stay under rate limits
//
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useProfile } from './use-profile';
import {
  fetchTransactions,
  recordTransaction,
  calcPlatformFee,
  PLATFORM_FEE_RATE,
  type TransactionRow,
} from '@/services/transactionService';
import { createNotification } from '@/services/notificationService';
import { supabase } from '@/lib/supabase';

export type { TransactionRow };
export { PLATFORM_FEE_RATE, calcPlatformFee };

const MONAD_RPC = 'https://testnet-rpc.monad.xyz';
const MONAD_EXPLORER = 'https://testnet.monadscan.com';

// Internal transfer event signature (non-standard, used by some chains for native)
// We use eth_getLogs with a wide address filter for ERC20 only.
const ERC20_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  '0x534b2f3a21130d7a60830c2df862319e593943a3': { symbol: 'USDC', decimals: 6 },
};
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const PRICES: Record<string, number> = { MON: 0.189, USDC: 1.0, WETH: 1950 };

function usdOf(amount: number, symbol: string) { return amount * (PRICES[symbol] ?? 0); }
function shorten(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

/** Fetch all tx hashes already stored for a profile in one query */
async function fetchKnownHashes(profileId: string): Promise<Set<string>> {
  if (!supabase) return new Set();
  const { data } = await supabase
    .from('transactions')
    .select('tx_hash')
    .eq('profile_id', profileId)
    .not('tx_hash', 'is', null);
  return new Set((data ?? []).map((r: any) => r.tx_hash as string));
}

export interface OnChainTransaction extends TransactionRow {
  hash: string;
  usdValue: number;
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
  const syncedRef = useRef(false); // only sync once per session

  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
  const address = embeddedWallet?.address;
  const profileId = profile?.id;

  // ── 1. Load from DB immediately ─────────────────────────────────────────────
  const loadFromDB = useCallback(async () => {
    if (!profileId) return;
    const rows = await fetchTransactions(profileId);
    setTransactions(rows.map(rowToTx));
  }, [profileId]);

  useEffect(() => {
    if (ready && authenticated && profileId) loadFromDB();
  }, [ready, authenticated, profileId, loadFromDB]);

  // ── 2. Deferred on-chain sync (5s delay, runs once per session) ─────────────
  useEffect(() => {
    if (!address || !profileId || !ready || !authenticated) return;
    if (syncedRef.current) return; // already synced this session

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function syncOnChain() {
      if (!address || !profileId) return;
      setLoading(true);
      setError(null);
      syncedRef.current = true;

      try {
        const addrLower = address.toLowerCase();

        // Get latest block — 1 RPC call
        const latestHex: string = await rpc('eth_blockNumber', []);
        const latest = parseInt(latestHex, 16);

        // Scan last 500 blocks for native MON + ERC20
        const SCAN_DEPTH = 500;
        const fromBlock = '0x' + Math.max(0, latest - SCAN_DEPTH).toString(16);
        const toBlock = latestHex;

        const pad = (a: string) => '0x' + a.slice(2).padStart(64, '0');

        // ── Fetch ERC20 transfers (2 calls: outgoing + incoming) ────────────
        await sleep(200); // small delay before RPC burst
        const [erc20Out, erc20In] = await Promise.allSettled([
          rpc('eth_getLogs', [{
            fromBlock,
            toBlock,
            topics: [TRANSFER_TOPIC, pad(address)],
          }]),
          rpc('eth_getLogs', [{
            fromBlock,
            toBlock,
            topics: [TRANSFER_TOPIC, null, pad(address)],
          }]),
        ]);

        const erc20Logs: any[] = [
          ...(erc20Out.status === 'fulfilled' && Array.isArray(erc20Out.value) ? erc20Out.value : []),
          ...(erc20In.status === 'fulfilled' && Array.isArray(erc20In.value) ? erc20In.value : []),
        ];

        // ── Fetch native MON: scan blocks sequentially in small batches ─────
        // Use eth_getBlockByNumber but limit to 20 recent blocks (much less than 100)
        // and fetch sequentially to avoid rate limits.
        const NATIVE_SCAN = 20;
        const nativeFrom = Math.max(0, latest - NATIVE_SCAN);
        const nativeTxs: Array<{ hash: string; from: string; to: string; value: string; input: string; blockTimestamp: string }> = [];

        for (let n = latest; n >= nativeFrom; n--) {
          if (cancelled) break;
          await sleep(50); // 50ms between block fetches = ~400ms for 20 blocks, well under rate limit
          try {
            const block = await rpc('eth_getBlockByNumber', ['0x' + n.toString(16), true]);
            if (!block?.transactions) continue;
            const ts = new Date(parseInt(block.timestamp, 16) * 1000).toISOString();
            for (const tx of block.transactions) {
              const fromL = (tx.from as string)?.toLowerCase();
              const toL = (tx.to as string)?.toLowerCase();
              if (fromL !== addrLower && toL !== addrLower) continue;
              const isERC20Contract = toL && toL in ERC20_TOKENS;
              const hasInput = tx.input && tx.input !== '0x';
              if (isERC20Contract && hasInput) continue;
              const amount = Number(BigInt(tx.value as string)) / 1e18;
              if (amount === 0) continue;
              nativeTxs.push({ hash: tx.hash, from: tx.from, to: tx.to ?? '', value: tx.value, input: tx.input, blockTimestamp: ts });
            }
          } catch {
            // ignore individual block errors
          }
        }

        if (cancelled) return;

        // ── Bulk-fetch known hashes (1 DB query) ────────────────────────────
        const known = await fetchKnownHashes(profileId);

        // ── Build list of new txs to record ────────────────────────────────
        type TxInput = Parameters<typeof recordTransaction>[0];
        const toRecord: TxInput[] = [];

        // Native MON
        for (const tx of nativeTxs) {
          if (known.has(tx.hash)) continue;
          const isOut = tx.from.toLowerCase() === addrLower;
          const amount = Number(BigInt(tx.value)) / 1e18;
          toRecord.push({
            profileId,
            txHash: tx.hash,
            type: isOut ? 'outgoing' : 'incoming',
            counterparty: isOut ? shorten(tx.to) : shorten(tx.from),
            fromAddress: tx.from,
            toAddress: tx.to,
            asset: 'MON',
            amount,
            usdValue: usdOf(amount, 'MON'),
            platformFee: isOut ? calcPlatformFee(amount) : 0,
            status: 'confirmed',
            memo: tx.input && tx.input !== '0x' ? 'Contract interaction' : '',
            explorerUrl: `${MONAD_EXPLORER}/tx/${tx.hash}`,
          });
        }

        // ERC20 — get block timestamps for unique blocks
        const uniqueBlocks = [...new Set(erc20Logs.map((l: any) => l.blockNumber as string))];
        const btsMap = new Map<string, string>();
        // Sequential to avoid another RPC burst
        for (const bh of uniqueBlocks) {
          if (cancelled) break;
          await sleep(80);
          try {
            const b = await rpc('eth_getBlockByNumber', [bh, false]);
            if (b?.timestamp) btsMap.set(bh, new Date(parseInt(b.timestamp, 16) * 1000).toISOString());
          } catch { /* skip */ }
        }

        for (const log of erc20Logs) {
          const token = ERC20_TOKENS[(log.address as string).toLowerCase()];
          if (!token) continue;
          const txHash = log.transactionHash as string;
          if (known.has(txHash)) continue;
          const fromAddr = '0x' + (log.topics[1] as string).slice(26);
          const toAddr = '0x' + (log.topics[2] as string).slice(26);
          const isOut = fromAddr.toLowerCase() === addrLower;
          const amount = Number(BigInt(log.data as string)) / 10 ** token.decimals;
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
            platformFee: isOut ? calcPlatformFee(amount) : 0,
            status: 'confirmed',
            memo: '',
            explorerUrl: `${MONAD_EXPLORER}/tx/${txHash}`,
          });
        }

        if (cancelled || toRecord.length === 0) return;

        // ── Record sequentially with delay — no burst to Supabase ───────────
        for (const t of toRecord) {
          if (cancelled) break;
          const row = await recordTransaction(t);
          if (!row) continue;
          await sleep(100);
          const dir = t.type === 'incoming' ? 'Received' : 'Sent';
          const amt = `${t.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${t.asset}`;
          await createNotification(
            profileId,
            `${dir} ${amt}`,
            `${dir} ${amt} ${t.type === 'incoming' ? 'from' : 'to'} ${t.counterparty}`,
            t.type === 'incoming' ? 'success' : 'info',
          );
          await sleep(50);
        }

        if (!cancelled) await loadFromDB();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to sync transactions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Delay sync by 5s so Privy auth + wallet creation completes first
    timer = setTimeout(() => {
      if (!cancelled) syncOnChain();
    }, 5000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, profileId, ready, authenticated]);

  return { transactions, loading, error, address };
}
