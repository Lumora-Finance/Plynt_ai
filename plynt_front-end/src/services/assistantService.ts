import type { AssistantMessage, TransactionDraft } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────────
export type CardType = "portfolio" | "transactions" | "analytics" | "invoice_list" | "none";

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

export interface AIResponse {
  content: string;
  cardType: CardType;
  draft?: TransactionDraft;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const delay = (ms = 600) => new Promise<void>((r) => setTimeout(r, ms));

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const respond = (content: string, cardType: CardType = "none"): AIResponse => ({
  content,
  cardType,
});

// ─── Answer resolver ────────────────────────────────────────────────────────────
function resolveAnswer(question: string, ctx: AssistantContext): AIResponse {
  const q = question.toLowerCase();

  const txs = ctx.transactions ?? [];
  const assets = ctx.assets ?? [];
  const total = ctx.totalBalance ?? 0;

  const outgoing = txs.filter((t) => t.type === "outgoing" || t.type === "payment");
  const incoming = txs.filter((t) => t.type === "incoming");
  const totalIncome = incoming.reduce((s, t) => s + t.usdValue, 0);
  const totalExpenses = outgoing.reduce((s, t) => s + t.usdValue, 0);
  const netFlow = totalIncome - totalExpenses;
  const avgTx = txs.length > 0 ? (totalIncome + totalExpenses) / txs.length : 0;

  // ── Balance / portfolio ─────────────────────────────────────────────────────
  if (
    q.includes("how much money") ||
    q.includes("how much do i have") ||
    q.includes("total balance") ||
    q.includes("portfolio value") ||
    q.includes("what is my total")
  ) {
    if (total === 0)
      return respond(
        "💸 Your wallet looks empty on Monad Testnet right now.\n\nNo worries — head to [faucet.monad.xyz](https://faucet.monad.xyz) to claim some free testnet MON and get started!",
        "portfolio",
      );
    return respond(
      `💼 Here's a snapshot of your portfolio!\n\nYour total balance is **${fmt(total)}** across ${assets.length} asset${assets.length !== 1 ? "s" : ""}. Looking good 🟣`,
      "portfolio",
    );
  }

  if (q.includes("portfolio") || q.includes("asset distribution") || q.includes("how is my portfolio")) {
    if (total === 0)
      return respond("🪙 Your portfolio is empty. Receive some MON or tokens to get started!", "portfolio");
    return respond(
      `📊 Here's your full portfolio breakdown!\n\nTotal value: **${fmt(total)}**. I've pulled up your asset allocation below 👇`,
      "portfolio",
    );
  }

  if (q.includes("how much usdc")) {
    return respond("💱 USDC isn't tracked in your Plynt wallet — your balance is in **MON**, the native Monad token. Ask me \"how much MON do I have\" instead!", "portfolio");
  }

  if (q.includes("how much mon") || q.includes("mon balance") || q.includes("mon do i have")) {
    const mon = assets.find((a) => a.symbol === "MON");
    if (!mon || mon.balance === 0)
      return respond("🟣 No MON yet! Grab some from [faucet.monad.xyz](https://faucet.monad.xyz) — it's free on testnet.", "portfolio");
    return respond(
      `🟣 You're holding **${mon.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} MON** (≈${fmt(mon.usdValue)}), which is **${mon.allocation}%** of your portfolio.`,
      "portfolio",
    );
  }

  // ── Spending ────────────────────────────────────────────────────────────────
  if (q.includes("how much did i spend") || q.includes("how much have i spent") || q.includes("spending")) {
    if (outgoing.length === 0)
      return respond("🎉 No outgoing transactions found! Your wallet is squeaky clean.\n\nEither you haven't sent anything yet, or it's outside the scanned range.");
    return respond(
      `💸 You've sent **${fmt(totalExpenses)}** across **${outgoing.length}** outgoing transaction${outgoing.length > 1 ? "s" : ""} on Monad Testnet.\n\nHere's a look at your activity breakdown 📉`,
      "analytics",
    );
  }

  if (q.includes("biggest transaction") || q.includes("largest transaction")) {
    if (txs.length === 0)
      return respond("🔍 No transactions found yet. Make your first move and I'll track it for you!");
    const sorted = [...txs].sort((a, b) => b.usdValue - a.usdValue).slice(0, 3);
    const lines = sorted
      .map((t, i) => `${i + 1}. ${t.type === "incoming" ? "📥" : "📤"} **${fmt(t.usdValue)}** ${t.asset} — ${t.counterparty}`)
      .join("\n");
    return respond(`🏆 Your biggest transactions:\n\n${lines}\n\nHere's the full picture 👇`, "transactions");
  }

  if (
    q.includes("recent") ||
    q.includes("last transaction") ||
    q.includes("show transactions") ||
    q.includes("my transactions")
  ) {
    if (txs.length === 0)
      return respond("📭 No transactions found yet. Send or receive something on Monad Testnet and I'll start tracking it!");
    return respond(
      `🕐 Here are your most recent transactions on Monad Testnet 👇\n\n${txs.length} total on-chain transaction${txs.length !== 1 ? "s" : ""} found.`,
      "transactions",
    );
  }

  // ── Income ──────────────────────────────────────────────────────────────────
  if (q.includes("how much did i receive") || q.includes("received") || q.includes("income")) {
    if (incoming.length === 0)
      return respond("📬 No incoming transactions found yet. Share your address to start receiving assets!");
    return respond(
      `📥 You've received **${fmt(totalIncome)}** across **${incoming.length}** incoming transaction${incoming.length > 1 ? "s" : ""}. Nice work! 💪`,
      "transactions",
    );
  }

  // ── Analytics / Summary ─────────────────────────────────────────────────────
  if (
    q.includes("summary") ||
    q.includes("summarize") ||
    q.includes("financial overview") ||
    q.includes("overview") ||
    q.includes("analytics") ||
    q.includes("income vs") ||
    q.includes("breakdown") ||
    q.includes("show me my") ||
    q.includes("financial activity")
  ) {
    if (txs.length === 0 && total === 0)
      return respond(
        "🌱 Your wallet is brand new — no activity yet!\n\nGet started by grabbing some testnet MON from [faucet.monad.xyz](https://faucet.monad.xyz), then send, receive, or create an invoice.",
        "none",
      );
    const sentiment = netFlow >= 0 ? "You're in the green 🟢" : "You're spending more than you receive 🔴";
    return respond(
      `📊 Here's your full financial overview!\n\n**${sentiment}**\n\n• Portfolio: **${fmt(total)}**\n• Income: **${fmt(totalIncome)}** (${incoming.length} tx)\n• Expenses: **${fmt(totalExpenses)}** (${outgoing.length} tx)\n• Net flow: **${netFlow >= 0 ? "+" : ""}${fmt(netFlow)}**\n• Avg transaction: **${fmt(avgTx)}**\n\nI've pulled up your analytics below 📉`,
      "analytics",
    );
  }

  // ── Invoices ────────────────────────────────────────────────────────────────
  if (q.includes("invoice") || q.includes("unpaid") || q.includes("owed") || q.includes("billing")) {
    return respond(
      `🧾 Let me pull up your invoices!\n\nYou can create, manage, and share payment links for invoices right here — no need to leave this page.`,
      "invoice_list",
    );
  }

  // ── Salary ──────────────────────────────────────────────────────────────────
  if (q.includes("salary")) {
    return respond(
      `💼 Salary tracking is set up in the Salary section.\n\nYou can configure your employer, amount, and automatic distribution rules — I can help you set up a split right here if you'd like! Just tap **\"Set up salary distribution\"** below.`,
    );
  }

  // ── Gifts ───────────────────────────────────────────────────────────────────
  if (q.includes("gift")) {
    return respond(
      `🎁 Programmable gifts let you send time-locked assets to anyone!\n\nYou can set an unlock date, expiry, and even make it recurring. Want me to help you create one? Tap **\"Create a programmable gift\"** below.`,
    );
  }

  // ── Network / MON ───────────────────────────────────────────────────────────
  if (q.includes("what network") || q.includes("which network") || q.includes("monad")) {
    return respond(
      `🟣 You're on **Monad Testnet** (Chain ID: 10143).\n\nMonad is a high-performance EVM-compatible L1 with 10,000 TPS and ~1-second block times. Your Privy embedded wallet is connected natively — no MetaMask needed!`,
    );
  }

  if (q.includes("wallet address") || q.includes("my address") || q.includes("show qr")) {
    return respond(
      ctx.walletAddress
        ? `📋 Your Monad wallet address:\n\n\`${ctx.walletAddress}\`\n\nOpening your receive panel now 👇`
        : "🔐 Your wallet address isn't available right now. Make sure you're signed in.",
    );
  }

  // ── Default ──────────────────────────────────────────────────────────────────
  if (txs.length === 0 && total === 0) {
    return respond(
      `👋 Your wallet is empty on Monad Testnet right now.\n\nHere's how to get started:\n1. 🚰 Grab free testnet MON at [faucet.monad.xyz](https://faucet.monad.xyz)\n2. 📤 Send or receive tokens to build history\n3. 🧾 Create an invoice for your first client\n\nI'm here to help with any of these!`,
    );
  }

  return respond(
    `💡 Your portfolio is **${fmt(total)}** with **${txs.length}** on-chain transaction${txs.length !== 1 ? "s" : ""} on Monad Testnet.\n\nYou can ask me about your balance, transactions, invoices, gifts, or salary — or use the chips below to take action!`,
    total > 0 ? "portfolio" : "none",
  );
}

// ─── Public API ─────────────────────────────────────────────────────────────────
export const assistantService = {
  async sendMessage(
    text: string,
    ctx: AssistantContext = {},
  ): Promise<AssistantMessage & { cardType: CardType }> {
    await delay(Math.random() * 300 + 400); // natural feel: 400-700ms
    const result = resolveAnswer(text, ctx);
    return {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: result.content,
      createdAt: new Date().toISOString(),
      cardType: result.cardType,
      ...(result.draft ? { draft: result.draft } : {}),
    };
  },
};
