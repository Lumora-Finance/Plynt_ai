// ─── Core primitives ──────────────────────────────────────────────────────────
export type AssetSymbol = "USDC" | "MON" | "WETH" | "AQUA";
export type TransactionType = "incoming" | "outgoing" | "payment" | "swap";
export type TransactionStatus = "confirmed" | "pending" | "failed";
export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue";

// ─── Existing models ──────────────────────────────────────────────────────────
export interface Asset {
  id: string;
  name: string;
  symbol: AssetSymbol;
  balance: number;
  usdValue: number;
  change: number;
  allocation: number;
  issuer?: string;
}

export interface Wallet {
  id: string;
  name: string;
  address: string;
  network: "Monad Testnet" | "Monad Mainnet";
  connected: boolean;
  totalBalance: number;
  assets: Asset[];
}

export interface Transaction {
  id: string;
  hash: string;
  type: TransactionType;
  counterparty: string;
  from: string;
  to: string;
  asset: AssetSymbol;
  amount: number;
  usdValue: number;
  status: TransactionStatus;
  timestamp: string;
  memo?: string;
  fee: number;
  explorerUrl: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  asset: AssetSymbol;
  status: "pending" | "confirmed";
  createdAt: string;
  transactionHash?: string;
}

export interface Invoice {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string;
  title: string;
  description: string;
  amount: number;
  asset: AssetSymbol;
  dueDate: string;
  createdAt: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  notes?: string;
  paymentLink: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  walletAddress: string;
  joinedAt: string;
  initials: string;
  role: string;
  avatar?: string;
  avatarAnimated?: string;
}

export interface AnalyticsPoint {
  date: string;
  balance: number;
  income: number;
  expenses: number;
  volume: number;
}

export interface Analytics {
  points: AnalyticsPoint[];
  totalVolume: number;
  income: number;
  expenses: number;
  netFlow: number;
  averageTransaction: number;
  invoicePerformance: { name: string; value: number }[];
  assetDistribution: { name: string; value: number }[];
}

export interface TransactionDraft {
  recipient: string;
  amount: number;
  asset: AssetSymbol;
  fee: number;
  memo?: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  draft?: TransactionDraft;
  /** If set, assistant response has an action flow attached */
  actionType?: AssistantActionType;
}

export interface InvoiceDraft {
  clientName: string;
  clientEmail: string;
  title: string;
  description: string;
  asset: AssetSymbol;
  dueDate: string;
  number: string;
  notes?: string;
  items: InvoiceItem[];
}

// ─── Salary ───────────────────────────────────────────────────────────────────
export type SalaryFrequency = "weekly" | "biweekly" | "monthly" | "quarterly";

export interface SalarySplitRule {
  id: string;
  label: string;
  destination: string;
  percentage: number;
  asset: AssetSymbol;
}

export interface SalaryRecord {
  id: string;
  employer: string;
  amount: number;
  asset: AssetSymbol;
  paymentDate: string;
  status: "received" | "pending" | "upcoming";
  txHash?: string;
  period: string;
}

export interface SalaryConfig {
  id: string;
  employer: string;
  amount: number;
  asset: AssetSymbol;
  frequency: SalaryFrequency;
  nextPayment: string;
  lastPayment?: string;
  distributionRules: SalarySplitRule[];
  autoDistribute: boolean;
}

// ─── Programmable Gifts ───────────────────────────────────────────────────────
export type GiftStatus = "scheduled" | "available" | "claimed" | "expired" | "cancelled";
export type GiftDirection = "sent" | "received";
export type GiftFrequency = "weekly" | "biweekly" | "monthly";

export interface Gift {
  id: string;
  direction: GiftDirection;
  recipient: string;
  recipientAddress?: string;
  sender: string;
  senderAddress?: string;
  amount: number;
  asset: AssetSymbol;
  message?: string;
  unlockDate: string;
  expirationDate?: string;
  /** If true this is a recurring gift */
  isRecurring: boolean;
  recurrenceCount?: number;
  recurrenceFrequency?: GiftFrequency;
  executedCount: number;
  status: GiftStatus;
  claimedAt?: string;
  createdAt: string;
  txHash?: string;
}

export interface GiftClaim {
  id: string;
  giftId: string;
  claimedAt: string;
  txHash: string;
  amount: number;
  asset: AssetSymbol;
}

// ─── AI Assistant ─────────────────────────────────────────────────────────────
export type AssistantActionType =
  | "create_gift"
  | "create_invoice"
  | "set_salary_distribution";

export interface AiQuery {
  id: string;
  question: string;
  category: string;
  answer: string;
  createdAt: string;
}

export interface AiInsight {
  id: string;
  text: string;
  type: "info" | "warning" | "tip" | "alert";
  createdAt: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardOverview {
  totalBalance: number;
  income: number;
  expenses: number;
  pendingInvoicesAmount: number;
  portfolioValue: number;
  nextSalary?: string;
  upcomingGifts: number;
}
