import type { Wallet } from "@/types";

export const mockWallet: Wallet = {
  id: "wallet-main",
  name: "Primary wallet",
  address: "0x3fA8C9d0a2C1e5F7b8D4E6A9c2B1F0E3D5C7A8B2",
  network: "Monad Testnet",
  connected: true,
  totalBalance: 12480.32,
  assets: [
    {
      id: "usdc",
      name: "USD Coin",
      symbol: "USDC",
      balance: 8742.18,
      usdValue: 8742.18,
      change: 4.8,
      allocation: 70.05,
      issuer: "Circle · 0x534b2f3A21130d7a60830c2Df862319e593943A3",
    },
    {
      id: "mon",
      name: "Monad",
      symbol: "MON",
      balance: 16428.5,
      usdValue: 3104.99,
      change: -1.2,
      allocation: 24.88,
      issuer: "Native",
    },
    {
      id: "weth",
      name: "Wrapped Ether",
      symbol: "WETH",
      balance: 0.3241,
      usdValue: 633.15,
      change: 2.1,
      allocation: 5.07,
      issuer: "Monad Native Bridge · 0xEE8c0E9f1BFFb4Eb878d8f15f368A02a35481242",
    },
  ],
};
