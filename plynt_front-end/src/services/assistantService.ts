import type { AssistantMessage, TransactionDraft } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface AssistantContext {
  walletAddress?: string;
  totalBalance?: number;
  assets?: { symbol: string; balance: number; usdValue: number; allocation: number }[];
  transactions?: {
    type: string;
    counterparty: string;
    amount: number;
    usdValue: number;
    asset: string;
    timestamp: string;
    status: string;
  }[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const response = (content: string, draft?: TransactionDraft): AssistantMessage => ({
  id: `assistant-${Date.now()}`,
  role: "assistant",
  content,
  createdAt: new Date().toISOString(),
  ...(draft ? { draft } : {}),
});

const delay = (ms = 500) => new Promise<void>((r) => setTimeout(r, ms));

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Answer resolver ────────────────────────────────────────────────────────────
function resolveAnswer(question: string, ctx: AssistantContext): string {
  const q = question.toLowerCase();

  const txs = ctx.transactions ?? [];
  const assets = ctx.assets ?? [];
  const totalBalance = ctx.totalBalance ?? 0;

  const outgoing = txs.filter((t) => t.type === "outgoing" || t.type === "payment");
  const incoming = txs.filter((t) => t.type === "incoming");
  const totalIncome = incoming.reduce((s, t) => s + t.usdValue, 0);
  const totalExpenses = outgoing.reduce((s, t) => s + t.usdValue, 0);
  const netFlow = totalIncome - totalExpenses;
  const avgTx = txs.length > 0 ? (totalIncome + totalExpenses) / txs.length : 0;

  // ── Balance / portfolio ─────────────────────────────────────────────────────
  if (
    q.includes("how much money do i have") ||
    q.includes("how much do i have") ||
    q.includes("total balance") ||
    q.includes("portfolio value")
  ) {
    if (totalBalance === 0) return "Your wallet appears to be empty on Monad Testnet. You can receive MON from the faucet at faucet.monad.xyz.";
    const breakdown = assets.map((a) => `• ${a.symbol}: ${fmt(a.usdValue)} (${a.allocation}%)`).join("\n");
    return `Your total portfolio balance is ${fmt(totalBalance)}:\n${breakdown}`;
  }

  if (q.includes("how much usdc")) {
    const usdc = assets.find((a) => a.symbol === "USDC");
    return usdc && usdc.balance > 0
      ? `You hold ${usdc.balance.toLocaleString()} USDC (${fmt(usdc.usdValue)}), representing ${usdc.allocation}% of your portfolio.`
      : "You don't have any USDC in your wallet yet.";
  }

  if (q.includes("how much mon")) {
    const mon = assets.find((a) => a.symbol === "MON");
    return mon && mon.balance > 0
      ? `You hold ${mon.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} MON (≈${fmt(mon.usdValue)}), representing ${mon.allocation}% of your portfolio.`
      : "You don't have any MON in your wallet yet. Get some from the Monad faucet.";
  }

  if (q.includes("how much weth")) {
    const weth = assets.find((a) => a.symbol === "WETH");
    return weth && weth.balance > 0
      ? `You hold ${weth.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })} WETH (≈${fmt(weth.usdValue)}), representing ${weth.allocation}% of your portfolio.`
      : "You don't have any WETH in your wallet yet.";
  }

  if (q.includes("portfolio") || q.includes("asset distribution") || q.includes("how is my portfolio")) {
    if (assets.length === 0 || totalBalance === 0) return "Your portfolio is empty. Receive some MON or tokens to get started.";
    return `Portfolio distribution:\n${assets.map((a) => `• ${a.symbol}: ${fmt(a.usdValue)} (${a.allocation}%)`).join("\n")}\n\nTotal: ${fmt(totalBalance)}`;
  }

  // ── Spending ────────────────────────────────────────────────────────────────
  if (q.includes("how much did i spend") || q.includes("how much have i spent")) {
    if (outgoing.length === 0) return "No outgoing transactions found on-chain yet.";
    return `You've sent ${fmt(totalExpenses)} across ${outgoing.length} outgoing transaction${outgoing.length > 1 ? "s" : ""} on Monad Testnet.`;
  }

  if (q.includes("biggest transaction") || q.includes("largest transaction")) {
    if (txs.length === 0) return "No transactions found yet.";
    const sorted = [...txs].sort((a, b) => b.usdValue - a.usdValue).slice(0, 3);
    return `Your largest transactions:\n${sorted.map((t) => `• ${fmt(t.usdValue)} ${t.asset} — ${t.type} (${new Date(t.timestamp).toLocaleDateString()})`).join("\n")}`;
  }

  if (q.includes("recent income") || q.includes("recent expense") || q.includes("recent transaction")) {
    if (txs.length === 0) return "No transactions found in your on-chain history yet.";
    const recent = [...txs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
    return `Recent activity:\n${recent.map((t) => `• ${t.type === "incoming" ? "+" : "−"}${fmt(t.usdValue)} ${t.asset} — ${t.counterparty} (${new Date(t.timestamp).toLocaleDateString()})`).join("\n")}`;
  }

  // ── Income ──────────────────────────────────────────────────────────────────
  if (q.includes("how much did i receive") || q.includes("how much have i received") || q.includes("received this month")) {
    if (incoming.length === 0) return "No incoming transactions found on-chain yet.";
    return `You've received ${fmt(totalIncome)} across ${incoming.length} incoming transaction${incoming.length > 1 ? "s" : ""}.`;
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  if (q.includes("summary") || q.includes("summarize") || q.includes("financial overview")) {
    if (txs.length === 0 && totalBalance === 0)
      return "Your wallet is new — no activity yet. Send or receive MON to get started on Monad Testnet.";
    return `Financial summary:\n• Portfolio: ${fmt(totalBalance)}\n• Income: ${fmt(totalIncome)} (${incoming.length} tx)\n• Expenses: ${fmt(totalExpenses)} (${outgoing.length} tx)\n• Net flow: ${netFlow >= 0 ? "+" : ""}${fmt(netFlow)}\n• Avg transaction: ${fmt(avgTx)}\n• Network: Monad Testnet`;
  }

  // ── Invoices ────────────────────────────────────────────────────────────────
  if (q.includes("invoice")) {
    return "Invoices are user-created in Plynt. Head to the Invoices section to create and track payment requests in USDC, MON, or WETH.";
  }

  // ── Automations / recurring ─────────────────────────────────────────────────
  if (q.includes("recurring payment") || q.includes("automation")) {
    return "Automations and recurring payments are user-configured in Plynt. Go to the Automations or Recurring Payments section to set up rules.";
  }

  // ── Salary ──────────────────────────────────────────────────────────────────
  if (q.includes("salary")) {
    return "Salary tracking is configurable in the Salary section. Set up your employer, amount, and automatic distribution rules there.";
  }

  // ── Gifts ───────────────────────────────────────────────────────────────────
  if (q.includes("gift")) {
    return "Programmable gifts let you send time-locked USDC to anyone. Go to the Gifts section to send or check received gifts.";
  }

  // ── Network info ─────────────────────────────────────────────────────────────
  if (q.includes("what network") || q.includes("which network") || q.includes("monad")) {
    return "Plynt runs on Monad Testnet (Chain ID 10143). Monad is a high-performance EVM-compatible Layer 1 with 10,000 TPS and ~1-second block times.";
  }

  if (q.includes("what is mon") || q.includes("what's mon")) {
    return "MON is the native token of Monad, used for gas fees. Your embedded Privy wallet holds MON on Monad Testnet.";
  }

  if (q.includes("wallet address") || q.includes("my address")) {
    return ctx.walletAddress
      ? `Your Monad embedded wallet address is:\n${ctx.walletAddress}`
      : "Your wallet address isn't available right now. Make sure you're signed in.";
  }

  // ── Send ─────────────────────────────────────────────────────────────────────
  if (q.includes("send") && q.match(/\d/)) {
    return "To send assets, click 'Send' on the Dashboard or Wallet page. You'll be able to send MON or tokens directly from your embedded Privy wallet on Monad Testnet.";
  }

  // ── Default ──────────────────────────────────────────────────────────────────
  if (txs.length === 0 && totalBalance === 0) {
    return "Your wallet is empty on Monad Testnet. Receive some MON to get started! Try the Monad faucet or ask a teammate to send you some testnet tokens.";
  }

  return `Your portfolio is ${fmt(totalBalance)}. You've made ${txs.length} on-chain transaction${txs.length !== 1 ? "s" : ""} on Monad Testnet. Ask me about your balance, transactions, invoices, or automations!`;
}

// ─── Public API ─────────────────────────────────────────────────────────────────
export const assistantService = {
  async sendMessage(text: string, ctx: AssistantContext = {}): Promise<AssistantMessage> {
    await delay(500);
    const answer = resolveAnswer(text, ctx);
    return response(answer);
  },
};
