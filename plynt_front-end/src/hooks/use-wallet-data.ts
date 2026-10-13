// src/hooks/use-wallet-data.ts
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';

const MONAD_TESTNET_RPC = 'https://testnet-rpc.monad.xyz';

// MON price approximation (testnet)
const MON_PRICE = 0.189;

async function rpcCall(rpc: string, method: string, params: unknown[]) {
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

export interface WalletAsset {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  usdValue: number;
  change: number;
  allocation: number;
  issuer: string;
}

export interface WalletData {
  address: string;
  network: string;
  connected: boolean;
  totalBalance: number;
  assets: WalletAsset[];
}

export function useWalletData() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [data, setData] = useState<WalletData | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchTick, setFetchTick] = useState(0);

  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
  const address = embeddedWallet?.address;

  // While Privy is loading OR authenticated but wallet hasn't been created yet,
  // keep showing a loading state instead of "no wallet found".
  // We give a generous 15-second grace window — wallet creation is usually
  // instant but can take a few seconds on first login.
  const privyLoading = !ready;
  const walletPending = ready && authenticated && !address;
  const loading = privyLoading || walletPending || fetching;

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    const run = async () => {
      setFetching(true);
      setError(null);
      try {
        // Fetch native MON balance only
        const monHex: string = await rpcCall(MONAD_TESTNET_RPC, 'eth_getBalance', [address, 'latest']);
        const monBalance = parseInt(monHex, 16) / 1e18;

        const monUsd = monBalance * MON_PRICE;

        const assets: WalletAsset[] = [
          {
            id: 'mon',
            name: 'Monad',
            symbol: 'MON',
            balance: monBalance,
            usdValue: monUsd,
            change: 0,
            allocation: 100,
            issuer: 'Native',
          },
        ];

        if (!cancelled) {
          setData({
            address,
            network: 'Monad Testnet',
            connected: true,
            totalBalance: monUsd,
            assets,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to fetch wallet data');
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, fetchTick]);

  return {
    data,
    loading,
    error,
    address,
    refetch: () => setFetchTick((t) => t + 1),
  };
}
