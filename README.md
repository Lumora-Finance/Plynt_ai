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
    <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
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

| Feature | Status |
|---|---|
| Privy embedded wallet (email / social login) | ✅ Live |
| Real-time MON + USDC balances via Monad RPC | ✅ Live |
| On-chain transaction history (native + ERC20) | ✅ Live |
| Send & receive on Monad Testnet | ✅ Live |
| Invoice creation, management & payment links | ✅ Live · Supabase |
| Programmable time-locked gifts | ✅ Live · Supabase |
| Salary tracking & distribution rules | ✅ Live · Supabase |
| AI financial assistant (natural language) | ✅ Live |
| Financial analytics & charts | ✅ Live |
| Admin panel (role-based access) | ✅ Live · Supabase |
| Dark / light theme | ✅ Live |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 6 + TanStack Start |
| Routing | TanStack Router (file-based) |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix UI |
| Icons | Lucide React |
| Charts | Recharts |
| Data Fetching | TanStack Query |
| Auth + Wallet | Privy (`@privy-io/react-auth`) |
| Blockchain | Monad Testnet (Chain ID 10143) |
| Database | Supabase (Postgres + RLS) |
| Package Manager | Bun |

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

- [Bun](https://bun.sh) (preferred) or Node.js 20+
- A [Privy](https://privy.io) app — grab your App ID from the dashboard
- A [Supabase](https://supabase.com) project — grab the URL and anon key

### Installation

```bash
# Clone the repository
git clone https://github.com/Lumora-Finance/Plynt_ai.git
cd Plynt_ai/plynt_front-end

# Install dependencies
bun install

# Start the development server
bun dev
```

Open [http://localhost:5173](http://localhost:5173).

### Environment Variables

Create a `.env` file in `plynt_front-end/`:

```env
# Privy — https://dashboard.privy.io → Settings → App ID
VITE_PRIVY_APP_ID=your_privy_app_id

# Supabase — https://app.supabase.com → Project Settings → API
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase CLI access token (never exposed to the browser)
SUPABASE_ACCESS_TOKEN=your_supabase_access_token
```

### Apply the Database Schema

```bash
cd plynt_front-end
SUPABASE_ACCESS_TOKEN=your_token npx supabase db push --linked
```

The migration at `supabase/migrations/` creates all required tables (`profiles`, `invoices`, `gifts`, `salary_config`, `salary_records`) with Row Level Security enabled.

### Available Scripts

| Command | Description |
|---|---|
| `bun dev` | Start the development server |
| `bun run build` | Production build |
| `bun run preview` | Preview the production build |
| `bun run lint` | ESLint checks |
| `bun run format` | Prettier formatting |

---

## How It Works

1. **Sign in** — Privy handles email / social login and creates an embedded EVM wallet on Monad automatically.
2. **Dashboard** — Live MON + USDC balances fetched directly from the Monad RPC. No indexer required.
3. **Transactions** — The app scans the last 2000 blocks for native MON transfers and ERC20 Transfer events.
4. **Invoices / Gifts / Salary** — Stored in Supabase, scoped per user via their Privy DID.
5. **AI Assistant** — Understands your wallet context (balances, transactions) and answers financial questions in plain English. Supported flows (create invoice, send money, create gift, set salary distribution) open inline modals pre-filled with the assistant's suggestions.

---

## Roadmap

- [x] Privy embedded wallet + on-chain wallet balances
- [x] On-chain transaction history (MON + ERC20)
- [x] Send & receive flows
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
4. Run `bun run lint` and `bun run build` before submitting
5. Open a pull request with a clear description

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <strong>Built on Monad · Powered by Privy · Designed for everyday finance</strong>
</div>
