// src/hooks/use-wallet-data.ts
import { useWallets } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';

const MONAD_RPC = 'https://testnet-rpc.monad.xyz';

// Token contracts on Monad Testnet (these are placeholder addresses — Monad testnet uses native MON, USDC and WETH may not have real contracts yet so we include what's available)
const TOKENS = [
  { symbol: 'USDC', address: '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea', decimals: 6, name: 'USD Coin' },
  { symbol: 'WETH', address: '0xB5a30b0FDc5EA94A52fDC42e3E9760Cb8449Fb37', decimals: 18, name: 'Wrapped Ether' },
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
  const { wallets } = useWallets();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
  const address = embeddedWallet?.address;

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    async function fetchBalances() {
      if (!address) return;
      setLoading(true);
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
            return raw / BigInt(10 ** token.decimals);
          }),
        );

        const usdcBalance = erc20Results[0]?.status === 'fulfilled' ? Number(erc20Results[0].value) : 0;
        const wethBalance = erc20Results[1]?.status === 'fulfilled' ? Number(erc20Results[1].value) : 0;

        // Price approximations (MON price unknown on testnet — use $0.189 as approximate)
        const MON_PRICE = 0.189;
        const WETH_PRICE = 1950;

        const monUsd = monBalance * MON_PRICE;
        const wethUsd = wethBalance * WETH_PRICE;
        const usdcUsd = usdcBalance; // USDC is 1:1
        const total = monUsd + wethUsd + usdcUsd;

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
          {
            id: 'weth',
            name: 'Wrapped Ether',
            symbol: 'WETH',
            balance: wethBalance,
            usdValue: wethUsd,
            change: 0,
            allocation: total > 0 ? Math.round((wethUsd / total) * 10000) / 100 : 0,
            issuer: 'Monad Bridge · ' + TOKENS[1].address,
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
        if (!cancelled) setLoading(false);
      }
    }

    fetchBalances();
    return () => { cancelled = true; };
  }, [address]);

  return { data, loading, error, address, refetch: () => {} };
}
