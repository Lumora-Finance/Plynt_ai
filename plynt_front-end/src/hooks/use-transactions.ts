// src/hooks/use-transactions.ts
import { useWallets } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';

const MONAD_RPC = 'https://testnet-rpc.monad.xyz';
const MONAD_EXPLORER = 'https://testnet.monadscan.com';

// ERC20 token contracts on Monad Testnet
// USDC: https://www.circle.com/blog/now-available-usdc-cctp-wallets-and-contracts-on-monad
const ERC20_TOKENS: Record<string, { symbol: string; decimals: number; name: string }> = {
  '0x534b2f3a21130d7a60830c2df862319e593943a3': { symbol: 'USDC', decimals: 6, name: 'USD Coin' },
};

// ERC20 Transfer event topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

async function rpcCall(method: string, params: unknown[]) {
  const res = await fetch(MONAD_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

export interface OnChainTransaction {
  id: string;
  hash: string;
  type: 'incoming' | 'outgoing' | 'payment' | 'swap';
  counterparty: string;
  from: string;
  to: string;
  asset: string;
  amount: number;
  usdValue: number;
  status: 'confirmed' | 'pending' | 'failed';
  timestamp: string;
  memo: string;
  fee: number;
  explorerUrl: string;
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

// Price approximations for Monad Testnet
const PRICES: Record<string, number> = {
  MON: 0.189,
  USDC: 1.0,
  WETH: 1950,
};

function getPrice(symbol: string): number {
  return PRICES[symbol] ?? 0;
}

export function useTransactions() {
  const { wallets } = useWallets();
  const [transactions, setTransactions] = useState<OnChainTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
  const address = embeddedWallet?.address;

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    async function fetchTransactions() {
      if (!address) return;
      setLoading(true);
      setError(null);

      try {
        const addrLower = address.toLowerCase();

        // Get latest block number
        const latestBlockHex: string = await rpcCall('eth_blockNumber', []);
        const latestBlock = parseInt(latestBlockHex, 16);

        const txMap = new Map<string, OnChainTransaction>();

        // ── 1. Fetch native MON transfers (scan last 100 blocks in batches) ──
        // eth_getLogs only works for contract events; native transfers need block scan.
        // We limit to 100 blocks for native to keep it fast.
        const nativeScanFrom = Math.max(0, latestBlock - 100);
        const blockNums = Array.from({ length: latestBlock - nativeScanFrom + 1 }, (_, i) => nativeScanFrom + i);

        const blockResults = await Promise.allSettled(
          blockNums.map((num) =>
            rpcCall('eth_getBlockByNumber', ['0x' + num.toString(16), true]),
          ),
        );

        for (const result of blockResults) {
          if (result.status !== 'fulfilled' || !result.value?.transactions) continue;
          const block = result.value;
          const blockTimestamp = new Date(parseInt(block.timestamp, 16) * 1000).toISOString();

          for (const tx of block.transactions) {
            const fromLower = (tx.from as string)?.toLowerCase();
            const toLower = (tx.to as string)?.toLowerCase();

            if (fromLower !== addrLower && toLower !== addrLower) continue;

            // Skip if it's a contract call to known ERC20s (will be captured via logs)
            const isERC20Contract = toLower && toLower in ERC20_TOKENS;
            const hasInput = tx.input && tx.input !== '0x';
            if (isERC20Contract && hasInput) continue;

            const isOutgoing = fromLower === addrLower;
            const valueWei = BigInt(tx.value as string);
            const amountMON = Number(valueWei) / 1e18;

            if (amountMON === 0 && isERC20Contract) continue; // pure ERC20 call, skip

            const gasPrice = BigInt((tx.gasPrice as string) || '0x0');
            const gasUsed = BigInt((tx.gas as string) || '0x5208');
            const feeMON = Number(gasPrice * gasUsed) / 1e18;

            const entry: OnChainTransaction = {
              id: tx.hash as string,
              hash: tx.hash as string,
              type: isOutgoing ? 'outgoing' : 'incoming',
              counterparty: isOutgoing
                ? shortenAddress((tx.to as string) ?? 'Contract')
                : shortenAddress(tx.from as string),
              from: tx.from as string,
              to: (tx.to as string) ?? 'Contract',
              asset: 'MON',
              amount: amountMON,
              usdValue: amountMON * getPrice('MON'),
              status: 'confirmed',
              timestamp: blockTimestamp,
              memo: hasInput ? 'Contract interaction' : '',
              fee: feeMON,
              explorerUrl: `${MONAD_EXPLORER}/tx/${tx.hash}`,
            };
            txMap.set(tx.hash as string, entry);
          }
        }

        // ── 2. Fetch ERC20 Transfer events via eth_getLogs ──────────────────────
        // Monad RPC limits eth_getLogs to 100 blocks per call — batch accordingly.
        const LOG_SCAN_DEPTH = 2000; // ~33 min of blocks
        const LOG_BATCH = 100;
        const logFrom = Math.max(0, latestBlock - LOG_SCAN_DEPTH);

        const padAddr = (a: string) => '0x' + a.slice(2).padStart(64, '0');

        // Build batch ranges: [[from, to], [from, to], ...]
        const ranges: [number, number][] = [];
        for (let start = logFrom; start <= latestBlock; start += LOG_BATCH) {
          ranges.push([start, Math.min(start + LOG_BATCH - 1, latestBlock)]);
        }

        // Fetch outgoing + incoming logs for each range in parallel (capped at 10 concurrent)
        const CONCURRENCY = 10;
        const erc20Logs: any[] = [];

        for (let i = 0; i < ranges.length; i += CONCURRENCY) {
          const batch = ranges.slice(i, i + CONCURRENCY);
          const batchResults = await Promise.allSettled(
            batch.flatMap(([from, to]) => {
              const fromHex = '0x' + from.toString(16);
              const toHex = '0x' + to.toString(16);
              return [
                // Outgoing: from = wallet
                rpcCall('eth_getLogs', [{
                  fromBlock: fromHex,
                  toBlock: toHex,
                  topics: [TRANSFER_TOPIC, padAddr(address)],
                }]),
                // Incoming: to = wallet
                rpcCall('eth_getLogs', [{
                  fromBlock: fromHex,
                  toBlock: toHex,
                  topics: [TRANSFER_TOPIC, null, padAddr(address)],
                }]),
              ];
            }),
          );
          for (const r of batchResults) {
            if (r.status === 'fulfilled' && Array.isArray(r.value)) {
              erc20Logs.push(...r.value);
            }
          }
        }

        const uniqueBlocks = [...new Set(erc20Logs.map((l: any) => l.blockNumber as string))];
        const blockTimestampMap = new Map<string, string>();

        await Promise.allSettled(
          uniqueBlocks.map(async (blockHex) => {
            const block = await rpcCall('eth_getBlockByNumber', [blockHex, false]);
            if (block?.timestamp) {
              blockTimestampMap.set(
                blockHex,
                new Date(parseInt(block.timestamp, 16) * 1000).toISOString(),
              );
            }
          }),
        );

        for (const log of erc20Logs) {
          const contractAddr = (log.address as string).toLowerCase();
          const token = ERC20_TOKENS[contractAddr];
          if (!token) continue;

          const fromAddr = '0x' + (log.topics[1] as string).slice(26);
          const toAddr = '0x' + (log.topics[2] as string).slice(26);
          const fromLower = fromAddr.toLowerCase();
          const toLower = toAddr.toLowerCase();

          if (fromLower !== addrLower && toLower !== addrLower) continue;

          const isOutgoing = fromLower === addrLower;
          const raw = BigInt(log.data as string);
          const amount = Number(raw) / 10 ** token.decimals;
          const usdValue = amount * getPrice(token.symbol);
          const timestamp = blockTimestampMap.get(log.blockNumber as string) ?? new Date().toISOString();
          const txHash = log.transactionHash as string;

          // Use txHash as key — deduplicate (in case MON entry already exists for same hash)
          const key = `${txHash}-${log.logIndex}`;
          if (!txMap.has(key)) {
            txMap.set(key, {
              id: key,
              hash: txHash,
              type: isOutgoing ? 'outgoing' : 'incoming',
              counterparty: isOutgoing ? shortenAddress(toAddr) : shortenAddress(fromAddr),
              from: fromAddr,
              to: toAddr,
              asset: token.symbol,
              amount,
              usdValue,
              status: 'confirmed',
              timestamp,
              memo: '',
              fee: 0,
              explorerUrl: `${MONAD_EXPLORER}/tx/${txHash}`,
            });
          }
        }

        // Sort newest first
        const sorted = [...txMap.values()].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

        if (!cancelled) setTransactions(sorted);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to fetch transactions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTransactions();
    return () => {
      cancelled = true;
    };
  }, [address]);

  return { transactions, loading, error, address };
}
