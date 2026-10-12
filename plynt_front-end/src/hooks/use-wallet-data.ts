// src/hooks/use-wallet-data.ts
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect, useState, useCallback } from 'react';

const MONAD_RPC = 'https://testnet-rpc.monad.xyz';

// Token contracts on Monad Testnet
// USDC: official Circle deployment — https://www.circle.com/blog/now-available-usdc-cctp-wallets-and-contracts-on-monad
const TOKENS = [
  { symbol: 'USDC', address: '0x534b2f3A21130d7a60830c2Df862319e593943A3', decimals: 6, name: 'USD Coin' },
];

// ERC20 balanceOf ABI calldata
function balanceOfCalldata(address: string): string {
  // balanceOf(address) = 0x70a08231 + 32-byte padded address
  return '0x70a08231' + address.slice(2).padStart(64, '0');
}

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

  // ── True loading state: Privy not ready yet OR authenticated but wallet
  // hasn't been created/surfaced yet (can take a few seconds after first sign-in)
  const privyLoading = !ready;
  const walletCreating = ready && authenticated && !address;

  const loading = privyLoading || walletCreating || fetching;

  const fetchBalances = useCallback(async (addr: string) => {
    setFetching(true);
    setError(null);
    try {
      // Fetch native MON balance
      const monHex: string = await rpcCall('eth_getBalance', [addr, 'latest']);
      const monBalance = parseInt(monHex, 16) / 1e18;

      // Fetch ERC20 balances
      const erc20Results = await Promise.allSettled(
        TOKENS.map(async (token) => {
          const result: string = await rpcCall('eth_call', [
            { to: token.address, data: balanceOfCalldata(addr) },
            'latest',
          ]);
          const raw = BigInt(result);
          return Number(raw) / 10 ** token.decimals;
        }),
      );

      const usdcResult0 = erc20Results[0];
      const usdcBalance = usdcResult0?.status === 'fulfilled' ? Number(usdcResult0.value) : 0;

      // Price approximations (MON testnet)
      const MON_PRICE = 0.189;

      const monUsd = monBalance * MON_PRICE;
      const usdcUsd = usdcBalance; // USDC is 1:1
      const total = monUsd + usdcUsd;

      const assets: WalletAsset[] = [
        {
          id: 'mon',
          name: 'Monad',
          symbol: 'MON',
          balance: monBalance,
          usdValue: monUsd,
          change: 0,
          allocation: total > 0 ? Math.round((monUsd / total) * 10000) / 100 : 0,
          issuer: 'Native',
        },
        {
          id: 'usdc',
          name: 'USD Coin',
          symbol: 'USDC',
          balance: usdcBalance,
          usdValue: usdcUsd,
          change: 0,
          allocation: total > 0 ? Math.round((usdcUsd / total) * 10000) / 100 : 0,
          issuer: 'Circle · ' + TOKENS[0].address,
        },
      ];

      setData({
        address: addr,
        network: 'Monad Testnet',
        connected: true,
        totalBalance: total,
        assets,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch wallet data');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    const run = async () => {
      setFetching(true);
      setError(null);
      try {
        // Fetch native MON balance
        const monHex: string = await rpcCall('eth_getBalance', [address, 'latest']);
        const monBalance = parseInt(monHex, 16) / 1e18;

        // Fetch ERC20 balances
        const erc20Results = await Promise.allSettled(
          TOKENS.map(async (token) => {
            const result: string = await rpcCall('eth_call', [
              { to: token.address, data: balanceOfCalldata(address) },
              'latest',
            ]);
            const raw = BigInt(result);
            return Number(raw) / 10 ** token.decimals;
          }),
        );

        const usdcResult1 = erc20Results[0];
        const usdcBalance = usdcResult1?.status === 'fulfilled' ? Number(usdcResult1.value) : 0;

        const MON_PRICE = 0.189;

        const monUsd = monBalance * MON_PRICE;
        const usdcUsd = usdcBalance;
        const total = monUsd + usdcUsd;

        const assets: WalletAsset[] = [
          {
            id: 'mon',
            name: 'Monad',
            symbol: 'MON',
            balance: monBalance,
            usdValue: monUsd,
            change: 0,
            allocation: total > 0 ? Math.round((monUsd / total) * 10000) / 100 : 0,
            issuer: 'Native',
          },
          {
            id: 'usdc',
            name: 'USD Coin',
            symbol: 'USDC',
            balance: usdcBalance,
            usdValue: usdcUsd,
            change: 0,
            allocation: total > 0 ? Math.round((usdcUsd / total) * 10000) / 100 : 0,
            issuer: 'Circle · ' + TOKENS[0].address,
          },
        ];

        if (!cancelled) {
          setData({
            address,
            network: 'Monad Testnet',
            connected: true,
            totalBalance: total,
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
  // fetchTick allows imperative refetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, fetchTick]);

  return {
    data,
    /** True while Privy is initialising, while the embedded wallet is being
     *  created after first sign-in, or while RPC balances are being fetched. */
    loading,
    error,
    address,
    refetch: () => setFetchTick((t) => t + 1),
  };
}
