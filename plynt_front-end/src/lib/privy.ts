import type { PrivyClientConfig } from "@privy-io/react-auth";
import { defineChain } from "viem";

// ─── Monad Testnet chain definition ──────────────────────────────────────────
// Monad is not yet in Privy's SUPPORTED_CHAINS, so we define it via viem.
// Chain ID 10143 — https://docs.monad.xyz/developer-essentials/testnet
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Monadscan",
      url: "https://testnet.monadscan.com",
    },
  },
  testnet: true,
});

// ─── Privy configuration ──────────────────────────────────────────────────────
export const privyConfig: PrivyClientConfig = {
  // Sign-in methods: email OTP + Google OAuth only
  loginMethods: ["email", "google"],

  // Create an embedded Ethereum wallet for every new user automatically.
  // In Privy v3, `createOnLogin` is nested under `embeddedWallets.ethereum`.
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },

  // Default chain: Monad Testnet
  defaultChain: monadTestnet,
  supportedChains: [monadTestnet],

  // OAuth redirect URL — must match an allowed origin in your Privy dashboard.
  // Falls back to the current origin so it works on both localhost and prod.
  // Cast to any because older @privy-io/react-auth versions don't type this yet.
  ...(typeof window !== "undefined" ? {
    oauth: { redirectUrl: `${window.location.origin}/` },
  } : {}) as any,

  // Appearance — match Plynt's Gold & Milk design system
  appearance: {
    theme: "dark",
    accentColor: "#836EF9", // Monad purple, close to Plynt primary
    logo: "/plynt_logoo.png",
    walletChainType: "ethereum-only", // EVM only, no Solana
    landingHeader: "Sign in to PLYNT",
    loginMessage: "AI Financial Workspace on Monad",
  },

  // Funding: MoonPay sandbox for testnet
  fundingMethodConfig: {
    moonpay: {
      useSandbox: true,
    },
  },
};
