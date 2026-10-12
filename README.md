<div align="center">
  <img src="plynt_front-end/public/og-image.png" alt="Plynt — AI Financial Workspace on Monad" width="100%" />

  <h1>PLYNT</h1>
  <p><strong>AI-Powered Financial Workspace on Monad · Powered by Privy</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Monad-Testnet-6E54FF?style=flat-square&logo=ethereum&logoColor=white" alt="Monad" />
    <img src="https://img.shields.io/badge/Privy-Embedded%20Wallet-6E54FF?style=flat-square&logoColor=white" alt="Privy" />
    <img src="https://img.shields.io/badge/Supabase-Connected-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" />
  </p>

  <p>
    <a href="https://github.com/Lumora-Finance/Plynt_ai">GitHub</a> ·
    <a href="#getting-started">Get Started</a> ·
    <a href="#features">Features</a> ·
    <a href="#tech-stack">Stack</a>
  </p>
</div>

---

Plynt is an AI-powered financial workspace built on [Monad](https://monad.xyz) that uses [Privy](https://privy.io) embedded wallets. It combines real-time wallet management, on-chain transaction tracking, crypto payments, invoice management, programmable gifts, salary tracking, and an AI assistant — all in one clean interface.

---

## Features

| Feature | Status | Powered by |
|---|---|---|
| Email & Google sign-in | ✅ Live | Privy |
| Embedded EVM wallet — auto-created on login | ✅ Live | Privy |
| Real-time MON + USDC balances | ✅ Live | Privy wallet address → Monad RPC |
| On-chain transaction history (native + ERC20) | ✅ Live | Privy wallet address → Monad RPC |
| Send MON & USDC — real on-chain signing | ✅ Live | Privy `useSendTransaction` |
| Receive — QR code + copy address | ✅ Live | Privy embedded wallet address |
| Invoice creation, management & payment links | ✅ Live | Supabase |
| Programmable time-locked gifts | ✅ Live | Supabase |
| Salary tracking & distribution rules | ✅ Live | Supabase |
| AI financial assistant (natural language) | ✅ Live | Wallet context from Privy + Monad RPC |
| Financial analytics & charts | ✅ Live | Derived from on-chain data |
| Admin panel (role-based access) | ✅ Live | Supabase profiles table |
| Dark / light theme | ✅ Live | — |

---

## How Privy Powers Plynt

Privy is not just the auth layer — it is the wallet infrastructure the entire app is built on top of.

| Privy Feature | How Plynt Uses It |
|---|---|
| Email OTP + Google OAuth | The only sign-in methods — no seed phrases, no extensions |
| Embedded wallet (`createOnLogin`) | Every new user gets an EVM wallet on Monad Testnet automatically |
| `useWallets()` | Exposes the embedded wallet address used for all RPC calls |
| `useSendTransaction()` | Powers the Send modal — signs and broadcasts real MON + USDC transfers on Monad |
| Wallet address as identity | The address is used to scan Monad RPC for live balances and transaction history |
| Monad Testnet as default chain | Configured via `defineChain` with Chain ID 10143 — Privy routes all signing to Monad |
| Custom appearance | Plynt's purple accent (`#836EF9`) and logo injected into the Privy auth modal |
| MoonPay sandbox | Fiat on-ramp available in the Privy wallet UI (testnet sandbox mode) |

> **In short:** the wallet address Privy creates is the source of truth for everything — balances, transaction history, send/receive flows. No MetaMask. No browser extension. No seed phrase management.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 + TanStack Start |
| Routing | TanStack Router (file-based) |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix UI |
| Icons | Lucide React |
| Charts | Recharts |
| Data Fetching | TanStack Query |
| Auth + Wallet | Privy (`@privy-io/react-auth`) |
| Blockchain | Monad Testnet (Chain ID 10143) |
| Database | Supabase (Postgres + RLS) |
| Package Manager | npm / Node.js 20+ |

---

## Project Structure

```
Plynt_ai/
├── plynt_front-end/        # Main application
│   ├── src/
│   │   ├── routes/         # File-based pages (TanStack Router)
│   │   ├── components/     # Shared UI components
│   │   ├── hooks/          # useWalletData, useTransactions, useProfile…
│   │   ├── services/       # invoiceService, giftService, salaryService…
│   │   ├── lib/            # supabase.ts, privy.ts
│   │   └── types/          # Shared TypeScript types
│   └── supabase/
│       └── migrations/     # Postgres schema (profiles, invoices, gifts, salary)
└── smart-contract/         # Solidity contracts (WIP)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Privy](https://privy.io) app — get your App ID from the dashboard
- A [Supabase](https://supabase.com) project — get the URL and anon key

### Installation

```bash
# Clone the repository
git clone https://github.com/Lumora-Finance/Plynt_ai.git
cd Plynt_ai/plynt_front-end

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Environment Variables

Create a `.env` file inside `plynt_front-end/`:

```env
# Privy — https://dashboard.privy.io → Settings → App ID
VITE_PRIVY_APP_ID=your_privy_app_id

# Supabase — https://app.supabase.com → Project Settings → API
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase CLI access token (server-side only — never exposed to the browser)
SUPABASE_ACCESS_TOKEN=your_supabase_access_token
```

### Apply the Database Schema

```bash
cd plynt_front-end
SUPABASE_ACCESS_TOKEN=your_token npx supabase db push --linked
```

This migration creates all required tables (`profiles`, `invoices`, `gifts`, `salary_config`, `salary_records`) with Row Level Security enabled.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint checks |
| `npm run format` | Prettier formatting |

---

## Try the Product — Judge Access Instructions

Everything runs on Monad Testnet. No mainnet funds needed.

### Step 1 — Sign In
Visit the live app. On the landing page click **Continue with Google** or **Continue with Email**. [Privy](https://privy.io) creates an embedded EVM wallet on Monad Testnet automatically — no MetaMask or browser extension required.

### Step 2 — Get Testnet MON
After sign-in you land on the Dashboard. Your wallet address is shown in the top header bar. Copy it, go to [faucet.monad.xyz](https://faucet.monad.xyz), and claim free testnet MON. Return to Plynt — your balance updates live from the Monad RPC.

### Step 3 — Send & Receive
Click **Send** on the Dashboard. Enter any Monad wallet address and an amount. The transaction is signed through your Privy embedded wallet via `useSendTransaction` and broadcast to Monad Testnet. An explorer link lets you verify the transaction on Monadscan instantly.

### Step 4 — Explore Transactions
Head to **Transactions**. The app uses your Privy wallet address to scan the last 2000 blocks for native MON transfers and USDC ERC20 Transfer events in real time — no indexer, direct RPC calls to Monad.

### Step 5 — Create an Invoice
Go to **Invoices → New Invoice**. Add client details, line items, amount, asset (USDC / MON / WETH), and due date. It saves to Supabase scoped to your Privy account. A shareable payment link is generated automatically.

### Step 6 — Send a Programmable Gift
Go to **Gifts → Send a gift**. Set a recipient name, wallet address, amount, and an unlock date (the date they can first claim it). Add an optional expiry and message. Supports one-time or recurring gifts.

### Step 7 — Configure Salary Distribution
Go to **Salary**. Enter your employer name, salary amount, frequency, and split rules — e.g. 60% Personal · 20% Savings · 20% Rent. All stored in Supabase and visualised as an allocation bar.

### Step 8 — Ask the AI Assistant
Go to **AI Assistant**. Ask anything about your wallet:
- *"How much MON do I have?"*
- *"Show my biggest transactions"*
- *"Give me a summary of my finances"*
- *"Create an invoice for $500 USDC due next Friday"*
- *"Send a gift of 100 USDC to my friend"*

The assistant reads your live on-chain data (via your Privy wallet address + Monad RPC) and opens pre-filled action modals for supported flows.

### Step 9 — Unlock the Admin Panel
The Admin Panel is visible only to users with the `admin` role. To grant yourself access:

1. Open your [Supabase project](https://supabase.com) → **SQL Editor**
2. Run:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```
3. Refresh Plynt — the **Admin Panel** appears at the bottom of the sidebar. From there you can view all users, manage roles, and inspect platform data.

---

## How It Works

1. **Sign in** — Privy handles email / social login and creates an embedded EVM wallet on Monad automatically.
2. **Dashboard** — Live MON + USDC balances fetched directly from the Monad RPC using the Privy wallet address.
3. **Transactions** — The app scans the last 2000 blocks for native MON transfers and ERC20 Transfer events using the Privy wallet address.
4. **Send** — `useSendTransaction` from Privy signs and broadcasts real transactions to Monad Testnet.
5. **Invoices / Gifts / Salary** — Stored in Supabase, scoped per user via their Privy DID.
6. **AI Assistant** — Reads live wallet data and answers financial questions in plain English. Supported flows open inline pre-filled modals.

---

## Roadmap

- [x] Privy embedded wallet + on-chain wallet balances
- [x] On-chain transaction history (MON + ERC20)
- [x] Send & receive flows via Privy `useSendTransaction`
- [x] Invoice CRUD with Supabase
- [x] Programmable gifts with Supabase
- [x] Salary tracking with Supabase
- [x] AI assistant with wallet context
- [x] Admin panel with role-based access
- [ ] On-chain invoice settlement verification
- [ ] Time-lock smart contract for gifts (Solidity)
- [ ] Token swap integration
- [ ] Mobile app

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feat/your-feature`
2. Follow existing TypeScript and component conventions
3. Keep wallet/blockchain logic inside `hooks/` and `services/`
4. Run `npm run lint` and `npm run build` before submitting
5. Open a pull request with a clear description

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <strong>Built on Monad · Powered by Privy · Designed for everyday finance</strong>
</div>
