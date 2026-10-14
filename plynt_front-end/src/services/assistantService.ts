import type { AssistantMessage, TransactionDraft } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────────
export type CardType =
  | "portfolio"
  | "transactions"
  | "analytics"
  | "invoice_list"
  | "gift_list"
  | "salary_info"
  | "none";

export interface AssistantInvoice {
  id: string;
  title: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  asset: string;
  status: "draft" | "pending" | "paid" | "overdue";
  dueDate: string;
  paymentLink?: string;
  createdAt: string;
}

export interface AssistantGift {
  id: string;
  direction: "sent" | "received";
  recipient: string;
  sender: string;
  amount: number;
  asset: string;
  status: string;
  unlockDate: string;
  expirationDate?: string;
  isRecurring: boolean;
  message?: string;
  createdAt: string;
}

export interface AssistantSalary {
  employer: string;
  amount: number;
  asset: string;
  frequency: string;
  nextPayment?: string;
  distributionRules: { label: string; percentage: number }[];
  autoDistribute: boolean;
}

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
  // ── Supabase data ──────────────────────────────────────────────────────────
  invoices?: AssistantInvoice[];
  gifts?: AssistantGift[];
  salary?: AssistantSalary | null;
  profile?: {
    displayName?: string | null;
    email?: string | null;
    role?: string;
  } | null;
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

const fmtCrypto = (n: number, symbol: string) =>
  `${n.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}`;

const respond = (content: string, cardType: CardType = "none"): AIResponse => ({
  content,
  cardType,
});

function pluralise(n: number, singular: string, plural = singular + "s") {
  return `${n} ${n === 1 ? singular : plural}`;
}

function relativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  if (diffDays > 1 && diffDays <= 7) return `in ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Answer resolver ────────────────────────────────────────────────────────────
function resolveAnswer(question: string, ctx: AssistantContext): AIResponse {
  const q = question.toLowerCase();

  const txs = ctx.transactions ?? [];
  const assets = ctx.assets ?? [];
  const total = ctx.totalBalance ?? 0;
  const invoices = ctx.invoices ?? [];
  const gifts = ctx.gifts ?? [];
  const salary = ctx.salary ?? null;
  const userName = ctx.profile?.displayName ?? ctx.profile?.email?.split("@")[0] ?? null;

  const outgoing = txs.filter((t) => t.type === "outgoing" || t.type === "payment");
  const incoming = txs.filter((t) => t.type === "incoming");
  const totalIncome = incoming.reduce((s, t) => s + t.usdValue, 0);
  const totalExpenses = outgoing.reduce((s, t) => s + t.usdValue, 0);
  const netFlow = totalIncome - totalExpenses;
  const avgTx = txs.length > 0 ? (totalIncome + totalExpenses) / txs.length : 0;

  // ── Invoice helpers ─────────────────────────────────────────────────────────
  const unpaidInvoices = invoices.filter((i) => i.status === "pending" || i.status === "overdue");
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const totalOwed = unpaidInvoices.reduce((s, i) => s + i.amount, 0);
  const totalReceived = paidInvoices.reduce((s, i) => s + i.amount, 0);

  // ── Gift helpers ────────────────────────────────────────────────────────────
  const sentGifts = gifts.filter((g) => g.direction === "sent");
  const receivedGifts = gifts.filter((g) => g.direction === "received");
  const activeGifts = gifts.filter((g) => g.status === "scheduled" || g.status === "available");
  const claimedGifts = gifts.filter((g) => g.status === "claimed");

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
        `💸 Your wallet is currently empty on Monad Testnet.\n\nHead to [faucet.monad.xyz](https://faucet.monad.xyz) to claim free testnet MON and get started!`,
        "portfolio",
      );

    const assetBreakdown = assets
      .map((a) => `• **${fmtCrypto(a.balance, a.symbol)}** (${fmt(a.usdValue)}) — ${a.allocation}%`)
      .join("\n");

    return respond(
      `💼 Here's your current balance${userName ? `, ${userName}` : ""}!\n\nTotal: **${fmt(total)}**\n\n${assetBreakdown}\n\nAll live from Monad Testnet 🟣`,
      "portfolio",
    );
  }

  if (q.includes("portfolio") || q.includes("asset distribution") || q.includes("how is my portfolio")) {
    if (total === 0)
      return respond("🪙 Your portfolio is empty. Receive some MON or tokens to get started!", "portfolio");

    const dominant = [...assets].sort((a, b) => b.usdValue - a.usdValue)[0];
    return respond(
      `📊 Your portfolio is worth **${fmt(total)}** across ${pluralise(assets.length, "asset")}.\n\nLargest position: **${dominant ? fmtCrypto(dominant.balance, dominant.symbol) : "—"}** at ${dominant?.allocation ?? 0}% of your portfolio.`,
      "portfolio",
    );
  }

  if (q.includes("how much usdc")) {
    const usdc = assets.find((a) => a.symbol === "USDC");
    if (!usdc || usdc.balance === 0)
      return respond(
        "💱 No USDC found in your wallet right now. Your primary asset on Monad Testnet is **MON**.",
        "portfolio",
      );
    return respond(
      `💱 You hold **${fmtCrypto(usdc.balance, "USDC")}** (≈${fmt(usdc.usdValue)}), which is **${usdc.allocation}%** of your total portfolio.`,
      "portfolio",
    );
  }

  if (q.includes("how much mon") || q.includes("mon balance") || q.includes("mon do i have")) {
    const mon = assets.find((a) => a.symbol === "MON");
    if (!mon || mon.balance === 0)
      return respond(
        "🟣 No MON yet in your wallet. Grab some from [faucet.monad.xyz](https://faucet.monad.xyz) — it's free on testnet.",
        "portfolio",
      );
    return respond(
      `🟣 You're holding **${fmtCrypto(mon.balance, "MON")}** (≈${fmt(mon.usdValue)}), which is **${mon.allocation}%** of your portfolio.\n\nLive balance from Monad Testnet.`,
      "portfolio",
    );
  }

  // ── Spending ────────────────────────────────────────────────────────────────
  if (q.includes("how much did i spend") || q.includes("how much have i spent") || q.includes("spending")) {
    if (outgoing.length === 0)
      return respond(
        "🎉 No outgoing transactions found in your history! Your wallet hasn't sent anything yet on Monad Testnet.",
        "analytics",
      );
    const biggest = [...outgoing].sort((a, b) => b.usdValue - a.usdValue)[0]!;
    return respond(
      `💸 You've spent **${fmt(totalExpenses)}** across **${pluralise(outgoing.length, "transaction")}** on Monad Testnet.\n\nLargest payment: **${fmt(biggest.usdValue)}** to ${biggest.counterparty} (${fmtCrypto(biggest.amount, biggest.asset)}) on ${relativeDate(biggest.timestamp)}.`,
      "analytics",
    );
  }

  if (q.includes("biggest transaction") || q.includes("largest transaction")) {
    if (txs.length === 0)
      return respond("🔍 No transactions found yet. Make your first move and I'll track it for you!");
    const sorted = [...txs].sort((a, b) => b.usdValue - a.usdValue).slice(0, 3);
    const lines = sorted
      .map(
        (t, i) =>
          `${i + 1}. ${t.type === "incoming" ? "📥" : "📤"} **${fmt(t.usdValue)}** ${t.asset} — ${t.counterparty} (${relativeDate(t.timestamp)})`,
      )
      .join("\n");
    return respond(
      `🏆 Your ${pluralise(sorted.length, "biggest transaction")}:\n\n${lines}\n\nFull history below 👇`,
      "transactions",
    );
  }

  if (
    q.includes("recent") ||
    q.includes("last transaction") ||
    q.includes("show transactions") ||
    q.includes("my transactions")
  ) {
    if (txs.length === 0)
      return respond(
        "📭 No transactions found yet. Send or receive something on Monad Testnet and I'll start tracking it!",
      );
    const last = txs[0]!;
    return respond(
      `🕐 You have **${pluralise(txs.length, "transaction")}** on Monad Testnet.\n\nMost recent: ${last.type === "incoming" ? "📥 received" : "📤 sent"} **${fmt(last.usdValue)}** ${last.asset} ${last.type === "incoming" ? "from" : "to"} ${last.counterparty} — ${relativeDate(last.timestamp)}.`,
      "transactions",
    );
  }

  // ── Income ──────────────────────────────────────────────────────────────────
  if (q.includes("how much did i receive") || q.includes("received") || q.includes("income")) {
    if (incoming.length === 0)
      return respond(
        "📬 No incoming transactions found yet. Share your wallet address to start receiving assets on Monad Testnet!",
      );
    const biggest = [...incoming].sort((a, b) => b.usdValue - a.usdValue)[0]!;
    return respond(
      `📥 You've received **${fmt(totalIncome)}** across **${pluralise(incoming.length, "transaction")}**.\n\nLargest incoming: **${fmt(biggest.usdValue)}** ${biggest.asset} from ${biggest.counterparty} on ${relativeDate(biggest.timestamp)}.`,
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
    q.includes("financial activity") ||
    q.includes("net flow") ||
    q.includes("what's my")
  ) {
    if (txs.length === 0 && total === 0 && invoices.length === 0 && !salary)
      return respond(
        `🌱 Your account is brand new${userName ? `, ${userName}` : ""} — no activity yet!\n\nGet started by:\n1. 🚰 Grabbing free testnet MON from [faucet.monad.xyz](https://faucet.monad.xyz)\n2. 🧾 Creating an invoice to get paid\n3. 🎁 Scheduling a programmable gift`,
        "none",
      );

    const sentiment = netFlow >= 0 ? "You're in the green 🟢" : "Spending more than receiving 🔴";
    const invoiceLine =
      invoices.length > 0
        ? `• Invoices: **${pluralise(invoices.length, "invoice")}** — ${fmt(totalOwed)} pending, ${fmt(totalReceived)} received\n`
        : "";
    const salaryLine = salary
      ? `• Salary: **${fmtCrypto(salary.amount, salary.asset)}/${salary.frequency}** from ${salary.employer}\n`
      : "";
    const giftsLine =
      gifts.length > 0 ? `• Gifts: **${pluralise(gifts.length, "gift")}** (${activeGifts.length} active)\n` : "";

    return respond(
      `📊 Financial overview${userName ? ` for ${userName}` : ""}!\n\n**${sentiment}**\n\n• Portfolio: **${fmt(total)}**\n• Income: **${fmt(totalIncome)}** (${txs.length > 0 ? pluralise(incoming.length, "tx") : "no txs"})\n• Expenses: **${fmt(totalExpenses)}** (${outgoing.length > 0 ? pluralise(outgoing.length, "tx") : "no txs"})\n• Net flow: **${netFlow >= 0 ? "+" : ""}${fmt(netFlow)}**${avgTx > 0 ? `\n• Avg transaction: **${fmt(avgTx)}**` : ""}\n${invoiceLine}${salaryLine}${giftsLine}`,
      "analytics",
    );
  }

  // ── Invoices ────────────────────────────────────────────────────────────────
  if (
    q.includes("invoice") ||
    q.includes("unpaid") ||
    q.includes("owed") ||
    q.includes("billing") ||
    q.includes("payment link") ||
    q.includes("how much am i owed")
  ) {
    if (invoices.length === 0)
      return respond(
        `🧾 You don't have any invoices yet.\n\nCreate your first invoice to start getting paid — I'll generate a shareable payment link automatically!`,
        "invoice_list",
      );

    if (overdueInvoices.length > 0) {
      const names = overdueInvoices.map((i) => i.clientName).join(", ");
      return respond(
        `🚨 You have **${pluralise(overdueInvoices.length, "overdue invoice")}** from: **${names}** — totalling **${fmt(overdueInvoices.reduce((s, i) => s + i.amount, 0))} ${overdueInvoices[0]?.asset ?? ""}**.\n\nAll **${pluralise(invoices.length, "invoice")}** shown below. **${fmt(totalOwed)}** is still outstanding.`,
        "invoice_list",
      );
    }

    if (unpaidInvoices.length > 0) {
      const nextDue = [...unpaidInvoices].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )[0]!;
      return respond(
        `🧾 You have **${pluralise(unpaidInvoices.length, "unpaid invoice")}** totalling **${fmt(totalOwed)}**.\n\nNearest due: **${nextDue.title}** — ${nextDue.amount} ${nextDue.asset} from ${nextDue.clientName}, due ${relativeDate(nextDue.dueDate)}.\n\nAll invoices are shown below 👇`,
        "invoice_list",
      );
    }

    return respond(
      `✅ All **${pluralise(paidInvoices.length, "invoice")}** are paid! Total received: **${fmt(totalReceived)}**.\n\nYour invoice history is below 👇`,
      "invoice_list",
    );
  }

  // ── Salary ──────────────────────────────────────────────────────────────────
  if (q.includes("salary") || q.includes("paycheck") || q.includes("distribution") || q.includes("split")) {
    if (!salary)
      return respond(
        `💼 No salary configured yet.\n\nSet up your salary in the **Salary** section — you can set your employer, income amount, frequency, and automatic distribution rules (e.g. 60% Personal · 20% Savings · 20% Rent).`,
        "salary_info",
      );

    const rules =
      salary.distributionRules.length > 0
        ? salary.distributionRules
            .map(
              (r) =>
                `• **${r.label}**: ${r.percentage}% → ${fmtCrypto((salary.amount * r.percentage) / 100, salary.asset)}`,
            )
            .join("\n")
        : "• No distribution rules configured yet";

    const nextPayLine = salary.nextPayment
      ? `\n\nNext payment: **${relativeDate(salary.nextPayment)}**`
      : "";

    return respond(
      `💼 Your salary from **${salary.employer}**:\n\n**${fmtCrypto(salary.amount, salary.asset)}** per ${salary.frequency}\n\n${rules}${nextPayLine}\n\nAuto-distribute: ${salary.autoDistribute ? "✅ On" : "❌ Off"}`,
      "salary_info",
    );
  }

  // ── Gifts ───────────────────────────────────────────────────────────────────
  if (
    q.includes("gift") ||
    q.includes("show my gifts") ||
    q.includes("active gifts") ||
    q.includes("gifts i've sent") ||
    q.includes("gifts i sent")
  ) {
    if (gifts.length === 0)
      return respond(
        `🎁 No gifts yet!\n\nProgrammable gifts let you send time-locked assets to anyone — set an unlock date, expiry, and even make it recurring. Want to create one? Use the **"Send a gift"** option below.`,
        "gift_list",
      );

    const sentSummary =
      sentGifts.length > 0
        ? `\n\n📤 **Sent**: ${pluralise(sentGifts.length, "gift")} — ${sentGifts
            .slice(0, 3)
            .map((g) => `${fmtCrypto(g.amount, g.asset)} to ${g.recipient}`)
            .join(", ")}${sentGifts.length > 3 ? ` and ${sentGifts.length - 3} more` : ""}`
        : "";

    const receivedSummary =
      receivedGifts.length > 0
        ? `\n\n📥 **Received**: ${pluralise(receivedGifts.length, "gift")} — ${receivedGifts
            .slice(0, 3)
            .map((g) => `${fmtCrypto(g.amount, g.asset)} from ${g.sender}`)
            .join(", ")}${receivedGifts.length > 3 ? ` and ${receivedGifts.length - 3} more` : ""}`
        : "";

    const activeLine =
      activeGifts.length > 0
        ? `\n\n⏳ **${pluralise(activeGifts.length, "active gift")}** — next unlock: ${relativeDate(
            [...activeGifts].sort((a, b) => new Date(a.unlockDate).getTime() - new Date(b.unlockDate).getTime())[0]!
              .unlockDate,
          )}`
        : "";

    const claimedLine =
      claimedGifts.length > 0
        ? `\n✅ **${pluralise(claimedGifts.length, "gift")}** already claimed`
        : "";

    return respond(
      `🎁 You have **${pluralise(gifts.length, "gift")}** total.${sentSummary}${receivedSummary}${activeLine}${claimedLine}`,
      "gift_list",
    );
  }

  // ── Network / MON ───────────────────────────────────────────────────────────
  if (q.includes("what network") || q.includes("which network") || q.includes("monad")) {
    return respond(
      `🟣 You're on **Monad Testnet** (Chain ID: 10143).\n\nMonad is a high-performance EVM-compatible L1 with 10,000 TPS and ~1-second block times. Your Privy embedded wallet is connected natively — no MetaMask needed!\n\nYour address: \`${ctx.walletAddress ?? "sign in to see"}\``,
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
  if (txs.length === 0 && total === 0 && invoices.length === 0 && gifts.length === 0 && !salary) {
    return respond(
      `👋 ${userName ? `Hey ${userName}! ` : ""}Your account is fresh on Monad Testnet — no activity yet.\n\nHere's how to get started:\n1. 🚰 Grab free testnet MON at [faucet.monad.xyz](https://faucet.monad.xyz)\n2. 🧾 Create an invoice and get paid\n3. 🎁 Send a programmable gift\n4. 💼 Set up salary distribution\n\nJust tap any chip below or ask me anything!`,
    );
  }

  // Build a rich contextual fallback
  const parts: string[] = [];
  if (total > 0)
    parts.push(`💼 Portfolio: **${fmt(total)}**`);
  if (txs.length > 0)
    parts.push(`📊 ${pluralise(txs.length, "on-chain transaction")} (net flow: ${netFlow >= 0 ? "+" : ""}${fmt(netFlow)})`);
  if (invoices.length > 0)
    parts.push(`🧾 ${pluralise(invoices.length, "invoice")} — ${fmt(totalOwed)} pending`);
  if (gifts.length > 0)
    parts.push(`🎁 ${pluralise(gifts.length, "gift")} (${activeGifts.length} active)`);
  if (salary)
    parts.push(`💼 Salary: ${fmtCrypto(salary.amount, salary.asset)}/${salary.frequency} from ${salary.employer}`);

  return respond(
    `Here's a quick snapshot${userName ? ` for ${userName}` : ""}:\n\n${parts.join("\n")}\n\nAsk me anything about your wallet, invoices, gifts, or salary!`,
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
