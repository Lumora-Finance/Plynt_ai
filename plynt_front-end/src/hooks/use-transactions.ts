// src/hooks/use-transactions.ts
import { useWallets } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';

const MONAD_RPC = 'https://testnet-rpc.monad.xyz';
const MONAD_EXPLORER = 'https://testnet.monadscan.com';

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
        // Try eth_getTransactionCount to get nonce (tells us if wallet has any txs)
        const txCountHex: string = await rpcCall('eth_getTransactionCount', [address, 'latest']);
        const txCount = parseInt(txCountHex, 16);

        if (txCount === 0) {
          if (!cancelled) {
            setTransactions([]);
            setLoading(false);
          }
          return;
        }

        // Scan recent blocks for transactions involving this address
        // Get latest block
        const latestBlockHex: string = await rpcCall('eth_blockNumber', []);
        const latestBlock = parseInt(latestBlockHex, 16);

        // Scan last 500 blocks (Monad is fast, ~1s blocks)
        const scanFrom = Math.max(0, latestBlock - 500);
        const txs: OnChainTransaction[] = [];

        // Batch fetch blocks
        const blockNums = Array.from({ length: Math.min(50, latestBlock - scanFrom + 1) }, (_, i) => latestBlock - i);

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
            const addrLower = address.toLowerCase();

            if (fromLower !== addrLower && toLower !== addrLower) continue;

            const isOutgoing = fromLower === addrLower;
            const valueWei = BigInt(tx.value as string);
            const amountMON = Number(valueWei) / 1e18;
            const gasPrice = BigInt(tx.gasPrice as string || '0x0');
            const gasUsed = BigInt(tx.gas as string || '0x5208');
            const feeWei = gasPrice * gasUsed;
            const feeMON = Number(feeWei) / 1e18;

            txs.push({
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
              usdValue: amountMON * 0.189,
              status: 'confirmed',
              timestamp: blockTimestamp,
              memo: tx.input && tx.input !== '0x' ? 'Contract interaction' : '',
              fee: feeMON,
              explorerUrl: `${MONAD_EXPLORER}/tx/${tx.hash}`,
            });
          }
        }

        // Sort newest first
        txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (!cancelled) setTransactions(txs);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to fetch transactions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTransactions();
    return () => { cancelled = true; };
  }, [address]);

  return { transactions, loading, error, address };
}
