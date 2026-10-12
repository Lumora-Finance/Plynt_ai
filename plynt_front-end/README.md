# Plynt

**AI-Powered Finance on Monad, Powered by Privy.**

Plynt is an AI-powered financial assistant built on Monad that uses Privy embedded wallets to make onchain finance accessible to everyone. It combines digital asset management, crypto payments, token swapping, asset conversion, invoicing, transaction tracking, and financial analytics in one intuitive platform.

Through Privy's wallet infrastructure and natural-language financial intelligence, Plynt aims to make managing digital assets and authorizing onchain transactions feel as simple as using a modern financial app.

## Overview

Plynt brings everyday financial activities into one seamless experience. Users can manage digital assets, send and receive payments, swap tokens, create invoices, track transactions, and understand their financial activity with the help of an AI assistant.

**Built on Monad and integrated with Privy, Plynt focuses on three core principles:**

- **Accessible wallets:** Use Privy's embedded wallet infrastructure to reduce onboarding friction and eliminate the need for users to manage a separate wallet extension.
- **Intelligent finance:** Use natural-language interactions to understand spending, analyze transactions, and prepare financial actions for review.
- **Onchain payments:** Use Monad-compatible smart contracts and wallet transactions to support transparent, verifiable financial operations.

Plynt is designed for consumers who want the benefits of blockchain-powered finance without needing to understand the underlying infrastructure.

## Core Features

### Privy-Powered Wallet Experience

Privy is Plynt's wallet infrastructure, supporting a familiar onboarding experience and embedded wallets.

The intended wallet experience includes:

- Email and supported social-login onboarding.
- Embedded wallet creation and access.
- Wallet address and digital asset management.
- Transaction authorization and signing.
- Integration with Monad-compatible transaction flows.
- A simplified experience that reduces unnecessary wallet-related friction.

Privy is used beyond authentication: its embedded wallet capabilities are intended to power the financial interactions users perform inside Plynt.

### AI Financial Assistant

Plynt helps users understand and manage their finances through natural-language interactions.

Users can ask questions about spending, transaction history, portfolio distribution, and unpaid invoices. The assistant can provide financial insights and prepare supported transactions for user review.

**Users remain in control of their funds.** AI-generated financial actions require appropriate user review and authorization before execution.

### Digital Asset Management

Provide a unified interface for viewing wallet information, managing supported digital assets, and accessing send and receive workflows.

Wallet balances and transaction information should come from the connected wallet or verified data source when live integrations are enabled.

### Crypto Payments

Enable users to send and receive digital assets through an intuitive payment interface.

The intended flow combines Privy wallet access and transaction signing with Monad settlement, allowing users to review payment details, authorize a transaction, and inspect its onchain status.

### Token Swapping and Asset Conversion

Support token swaps and conversion between compatible digital assets through supported swap infrastructure and liquidity providers.

Availability depends on the selected assets, network support, and integrated provider.

### Invoice Management

Create and manage invoices with line items, payment assets, due dates, and payment statuses.

The intended architecture supports shareable payment links and onchain settlement verification, allowing users to connect invoicing with digital asset payments.

### Transaction History

Browse transactions with search, filters, status information, and transaction details.

Where available, display transaction hashes and links to the Monad block explorer so users can independently verify onchain activity.

### Financial Analytics

Help users understand their finances with visualizations for portfolio distribution, balance changes, income, expenses, and transaction activity.

Support date filters such as 7D, 30D, 90D, and 1Y where the underlying data permits.

### Profile and Settings

Provide profile management, appearance preferences, notification settings, and wallet-related controls in one consistent interface.

---

## How Plynt Works

Plynt combines AI-assisted financial interactions, Privy wallet infrastructure, and Monad blockchain settlement.

1. **Onboard:** Users access Plynt through supported authentication methods and Privy's wallet experience.
2. **Manage:** Users view their assets and explore financial activity through Plynt's interface.
3. **Ask:** Users interact with the AI assistant to understand their finances or prepare supported financial actions.
4. **Review:** Users inspect payment details and authorize transactions.
5. **Settle:** Supported transactions are signed through the configured wallet infrastructure and submitted to Monad.
6. **Verify:** Transaction status and hashes are displayed when available, allowing users to verify settlement onchain.

The exact behavior of each step depends on the integrations implemented and enabled in the deployed application.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite |
| Routing | TanStack Router |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui + Radix UI |
| Icons | Lucide React |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Data Fetching | TanStack Query |
| Wallet Infrastructure | Privy |
| Blockchain | Monad |
| Smart Contracts | Solidity and EVM-compatible tooling |
| Backend and Persistence | Supabase |
| AI | AI integration for natural-language financial assistance |

The stack above describes the intended architecture. Integrations should be marked as implemented only when they are operational in the application.

---

## Architecture

Plynt separates the user interface, business logic, data services, wallet operations, and blockchain interactions to keep the application maintainable.

```text
Plynt Frontend
      |
      v
Application Service Layer
      |
      +---- AI Financial Assistant
      |
      +---- Supabase Data Services
      |
      +---- Privy Wallet Infrastructure
      |          |
      |          +---- Embedded Wallet Access
      |          +---- Transaction Signing
      |
      +---- Monad Network
                 |
                 +---- Onchain Payments
                 +---- Smart Contracts
                 +---- Transaction Verification
```

### Privy Integration

Privy provides the wallet infrastructure that connects Plynt's consumer-facing interface to onchain financial activity.

Its role extends beyond authentication to the embedded wallet experience and, where implemented, transaction signing and wallet-powered interactions.

Plynt's application services coordinate financial workflows, while users retain control over transaction authorization.

### Monad Integration

Monad provides the EVM-compatible blockchain environment for supported onchain financial operations.

Plynt is designed to use Monad for transaction settlement, smart contract interactions, and onchain verification.

### Supabase Integration

Supabase supports application data such as profiles, invoices, and other persistent records. Wallet operations and blockchain settlement remain separate from ordinary application data storage.

### AI Integration

The AI assistant interprets financial questions, summarizes available data, and prepares supported actions for user review. AI responses alone do not constitute transaction authorization.

---

## Design System

Plynt uses a purple-centered visual identity for a modern, approachable financial experience.

- **Primary purple:** `#8270FF`
- **Light-mode purple:** `#6E54FF`

The interface prioritizes clear financial information, responsive layouts, accessible controls, and a familiar consumer finance experience.

The goal is to make the blockchain infrastructure feel natural rather than exposing users to unnecessary technical complexity.

---

## Getting Started

### Prerequisites

- Node.js 20 or later.
- npm or another supported package manager.
- A Privy application configured for the intended authentication and wallet flows.
- A Monad network configuration for live blockchain features.
- Supabase credentials if the application uses Supabase services.

### Installation

```bash
# Clone the repository
git clone <YOUR_PLYNT_GITHUB_REPOSITORY_URL>

# Enter the project directory
cd plynt-frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open the local URL printed by Vite, typically `http://localhost:5173`.

### Environment Configuration

Configure the environment variables required by your actual integrations.

For example:

```env
VITE_PRIVY_APP_ID=your_privy_app_id
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Use the exact variable names expected by your implementation. Never expose server secrets, private keys, or privileged API credentials in frontend environment variables.

For live wallet transactions, configure the supported Monad network and wallet settings in accordance with the relevant SDK documentation.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run lint checks if configured |
| `npm run format` | Format the code if configured |

The available commands depend on the scripts defined in `package.json`.

---

## Roadmap

### Application Experience

- [x] Responsive application interface and purple design system.
- [x] Dashboard, wallet interface, and send/receive workflows.
- [x] Transaction history and transaction detail views.
- [x] Invoice management interface.
- [x] Financial analytics and AI assistant interface.
- [x] Profile, settings, and theme preferences.

### Privy and Wallet Infrastructure

- [ ] Verify embedded wallet creation and access in the deployed application.
- [ ] Complete and verify Privy wallet integration beyond authentication.
- [ ] Integrate and test transaction signing through the configured wallet.
- [ ] Verify successful transaction submission and status handling on Monad.
- [ ] Evaluate gas sponsorship where supported and configured.

### Monad and Financial Operations

- [ ] Complete live Monad wallet integration.
- [ ] Verify live onchain transaction submission.
- [ ] Implement and test required Solidity smart contracts.
- [ ] Complete onchain invoice settlement and payment verification.
- [ ] Integrate supported token swap and conversion providers.

### AI and Data

- [ ] Complete production AI integration.
- [ ] Connect financial insights to verified transaction and wallet data.
- [ ] Complete required data persistence and backend integrations.
- [ ] Add PDF invoice export.
- [ ] Explore a mobile application.

Roadmap items should be updated as features become operational and verified.

---

## Contributing

Contributions are welcome.

1. Fork and clone the repository.
2. Install dependencies.
3. Create a descriptive feature branch.

```bash
git checkout -b feat/privy-wallet-integration
```

4. Keep wallet and blockchain operations behind the appropriate service boundaries.
5. Follow the existing component and TypeScript conventions.
6. Preserve the purple design system and support light and dark themes.
7. Run the available lint and build checks.
8. Submit a pull request describing the changes and how they were tested.

Example commit:

```bash
git add .
git commit -m "feat: integrate Privy embedded wallet transactions"
git push origin feat/privy-wallet-integration
```

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

**Built on Monad. Powered by Privy. Designed for everyday finance.**