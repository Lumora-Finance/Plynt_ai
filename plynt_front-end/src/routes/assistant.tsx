import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Gift,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { assistantService, type CardType } from "@/services/assistantService";
import { useWalletData } from "@/hooks/use-wallet-data";
import { useTransactions } from "@/hooks/use-transactions";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/lib/supabase";
import type { AssetSymbol } from "@/types";
import { SendDialog, ReceiveDialog } from "@/components/wallet/wallet-flows";
import { DonutChart, FlowChart } from "@/components/analytics/charts";

export const Route = createFileRoute("/assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — PLYNT" }] }),
  component: AssistantPage,
});

// ─── Types ─────────────────────────────────────────────────────────────────────
type InputField = {
  key: string; label: string;
  type: "text" | "number" | "date" | "select" | "chips";
  placeholder?: string; options?: string[]; required?: boolean;
};
type FlowStep = { message: string; field: InputField };
type ModalTrigger =
  | { type: "invoice"; prefill: Record<string, string> }
  | { type: "send"; prefill: Record<string, string> }
  | { type: "gift"; prefill: Record<string, string> }
  | { type: "salary"; prefill: Record<string, string> };

type Flow = {
  id: string; title: string; steps: FlowStep[];
  buildConfirmSummary: (d: Record<string, string>) => Record<string, string>;
  confirmQuestion: string;
  modal: (d: Record<string, string>) => ModalTrigger;
};

type ChatMessage = {
  id: string; role: "user" | "assistant"; text: string; ts: Date;
  cardType?: CardType;
  flowStep?: FlowStep; flowId?: string;
  confirmation?: { summary: Record<string, string>; flowTitle: string; confirmQuestion: string; data: Record<string, string>; flowId: string };
  confirmed?: boolean; cancelled?: boolean;
  invoiceResult?: { id: string; paymentLink: string; title: string; amount: string; asset: string };
};
type FlowState = { flowId: string; stepIndex: number; data: Record<string, string>; activeMessageId: string };
type ActiveModal =
  | { type: "invoice"; prefill: Record<string, string> }
  | { type: "gift"; prefill: Record<string, string> }
  | { type: "salary"; prefill: Record<string, string> }
  | null;

// ─── Flows ─────────────────────────────────────────────────────────────────────
type FlowData = Record<string, string>;
const get = (d: FlowData, k: string, fb = "") => d[k] ?? fb;

const flows: Record<string, Flow> = {
  create_invoice: {
    id: "create_invoice", title: "Create an invoice",
    steps: [
      { message: "🧾 Who is this invoice for? Enter the client's name.", field: { key: "clientName", label: "Client name", type: "text", placeholder: "e.g. Acme Studio", required: true } },
      { message: "📧 What's the client's email?", field: { key: "clientEmail", label: "Client email", type: "text", placeholder: "finance@client.com", required: true } },
      { message: "📝 What's the invoice title?", field: { key: "title", label: "Invoice title", type: "text", placeholder: "e.g. Product design retainer", required: true } },
      { message: "💰 What's the total amount?", field: { key: "amount", label: "Amount", type: "number", placeholder: "e.g. 1500", required: true } },
      { message: "🪙 Which asset?", field: { key: "asset", label: "Asset", type: "chips", options: ["USDC", "WETH", "MON"] } },
      { message: "📅 What's the due date?", field: { key: "dueDate", label: "Due date", type: "date", required: true } },
      { message: "📌 Any notes for the client? (optional)", field: { key: "notes", label: "Notes", type: "text", placeholder: "e.g. Payment due within 14 days" } },
    ],
    buildConfirmSummary: (d) => ({
      "Client": get(d, "clientName"), "Email": get(d, "clientEmail"),
      "Title": get(d, "title"), "Amount": `${get(d, "amount")} ${get(d, "asset") || "USDC"}`,
      "Due": get(d, "dueDate"), ...(get(d, "notes") && get(d, "notes") !== "—" ? { "Notes": get(d, "notes") } : {}),
    }),
    confirmQuestion: "Ready to create this invoice and generate a payment link?",
    modal: (d) => ({ type: "invoice", prefill: d }),
  },
  send_money: {
    id: "send_money", title: "Send money",
    steps: [
      { message: "📤 Who are you sending to? Enter their wallet address (0x…).", field: { key: "recipient", label: "Recipient", type: "text", placeholder: "0x…", required: true } },
      { message: "💸 How much?", field: { key: "amount", label: "Amount", type: "number", placeholder: "e.g. 500", required: true } },
      { message: "🪙 Which asset?", field: { key: "asset", label: "Asset", type: "chips", options: ["USDC", "MON", "WETH"] } },
      { message: "📝 Any memo? (optional)", field: { key: "memo", label: "Memo", type: "text", placeholder: "e.g. Invoice #104" } },
    ],
    buildConfirmSummary: (d) => ({
      "To": get(d, "recipient"), "Amount": `${get(d, "amount")} ${get(d, "asset") || "USDC"}`,
      ...(get(d, "memo") && get(d, "memo") !== "—" ? { "Memo": get(d, "memo") } : {}),
      "Fee": "~0.000021 MON", "Network": "Monad Testnet",
    }),
    confirmQuestion: "Open the send dialog with these details?",
    modal: (d) => ({ type: "send", prefill: d }),
  },
  create_gift: {
    id: "create_gift", title: "Create a programmable gift",
    steps: [
      { message: "🎁 Who is the gift for?", field: { key: "recipient", label: "Recipient", type: "text", placeholder: "e.g. Mom, Alex", required: true } },
      { message: "💰 How much?", field: { key: "amount", label: "Amount", type: "number", placeholder: "e.g. 100", required: true } },
      { message: "🪙 Which asset?", field: { key: "asset", label: "Asset", type: "chips", options: ["USDC", "MON", "WETH"] } },
      { message: "📅 When should it unlock?", field: { key: "unlockDate", label: "Unlock date", type: "date", required: true } },
      { message: "⏳ Should it expire? (optional — skip to leave open)", field: { key: "expirationDate", label: "Expiry date", type: "date" } },
      { message: "🔄 Is this recurring?", field: { key: "recurring", label: "Recurring?", type: "chips", options: ["No — one-time", "Yes — weekly", "Yes — monthly"] } },
      { message: "💌 Add a personal message? (optional)", field: { key: "message", label: "Message", type: "text", placeholder: "e.g. Happy birthday! 🎂" } },
    ],
    buildConfirmSummary: (d) => ({
      "To": get(d, "recipient"), "Amount": `${get(d, "amount")} ${get(d, "asset") || "USDC"}`,
      "Unlocks": get(d, "unlockDate"),
      ...(get(d, "expirationDate") && get(d, "expirationDate") !== "—" ? { "Expires": get(d, "expirationDate") } : {}),
      "Recurrence": get(d, "recurring") || "No — one-time",
      ...(get(d, "message") && get(d, "message") !== "—" ? { "Message": get(d, "message") } : {}),
    }),
    confirmQuestion: "Create this programmable gift?",
    modal: (d) => ({ type: "gift", prefill: d }),
  },
  set_salary_distribution: {
    id: "set_salary_distribution", title: "Set up salary distribution",
    steps: [
      { message: "💼 What's your monthly salary amount?", field: { key: "salary", label: "Monthly salary", type: "number", placeholder: "e.g. 2000", required: true } },
      { message: "🪙 Which asset do you receive salary in?", field: { key: "asset", label: "Asset", type: "chips", options: ["USDC", "WETH", "MON"] } },
      { message: "🏦 What % to Personal?", field: { key: "personal", label: "Personal %", type: "number", placeholder: "e.g. 60", required: true } },
      { message: "🐖 What % to Savings?", field: { key: "savings", label: "Savings %", type: "number", placeholder: "e.g. 20", required: true } },
      { message: "🏠 What % to Rent?", field: { key: "rent", label: "Rent %", type: "number", placeholder: "e.g. 10", required: true } },
      { message: "👨‍👩‍👧 What % to Family?", field: { key: "family", label: "Family %", type: "number", placeholder: "e.g. 10", required: true } },
    ],
    buildConfirmSummary: (d) => {
      const s = Number(get(d, "salary"));
      const p = Number(get(d, "personal")), sv = Number(get(d, "savings")), r = Number(get(d, "rent")), f = Number(get(d, "family"));
      const total = p + sv + r + f;
      return {
        "Salary": `${get(d, "asset") || "USDC"} ${get(d, "salary")}/month`,
        "Personal": `${p}% → $${((s * p) / 100).toFixed(0)}`,
        "Savings": `${sv}% → $${((s * sv) / 100).toFixed(0)}`,
        "Rent": `${r}% → $${((s * r) / 100).toFixed(0)}`,
        "Family": `${f}% → $${((s * f) / 100).toFixed(0)}`,
        "Total": `${total}%${total !== 100 ? " ⚠️ must equal 100%" : " ✓"}`,
      };
    },
    confirmQuestion: "Save this salary distribution?",
    modal: (d) => ({ type: "salary", prefill: d }),
  },
};

// ─── Category suggestions ──────────────────────────────────────────────────────
type ChipDef = string | { text: string; flowId: string };
const categories = [
  { id: "actions", label: "Take Action", icon: Zap, chips: [{ text: "Send money", flowId: "send_money" }, "Receive assets", { text: "Create an invoice", flowId: "create_invoice" }, { text: "Send a gift", flowId: "create_gift" }, { text: "Set up salary", flowId: "set_salary_distribution" }] as ChipDef[] },
  { id: "money", label: "My Money", icon: Wallet, chips: ["How much do I have?", "How much did I spend?", "How much did I receive?", "Show my biggest transactions.", "What is my total balance?"] as ChipDef[] },
  { id: "analytics", label: "Analytics", icon: BarChart3, chips: ["Give me a financial summary.", "Show my income vs expenses.", "Show my portfolio breakdown.", "What's my net flow?", "Summarize my finances."] as ChipDef[] },
  { id: "portfolio", label: "Portfolio", icon: TrendingUp, chips: ["How is my portfolio distributed?", "How much USDC do I have?", "How much MON do I have?"] as ChipDef[] },
  { id: "payments", label: "Payments", icon: CreditCard, chips: ["Which invoices are unpaid?", "Show my invoices.", "How much am I owed?"] as ChipDef[] },
  { id: "gifts", label: "Gifts", icon: Gift, chips: [{ text: "Send a programmable gift", flowId: "create_gift" }, "Show my active gifts.", "Show gifts I've sent."] as ChipDef[] },
];

// ─── Markdown-lite renderer ────────────────────────────────────────────────────
function RenderText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1 leading-relaxed">
      {lines.map((line, i) => {
        if (!line) return <div key={i} className="h-1" />;
        // Bold: **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
            : <span key={j}>{part}</span>
        );
        // Bullet lines
        if (line.startsWith("•") || line.startsWith("-") || /^\d+\./.test(line)) {
          return <div key={i} className="flex gap-2 text-sm">{rendered}</div>;
        }
        return <p key={i} className="text-sm">{rendered}</p>;
      })}
    </div>
  );
}

// ─── Inline chart cards ────────────────────────────────────────────────────────

function PortfolioCard({ assets, total }: { assets: { symbol: string; balance: number; usdValue: number; allocation: number }[]; total: number }) {
  const colors = ["bg-primary", "bg-chart-2", "bg-chart-3"];
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-4" style={{ animation: "fadeSlideUp 0.4s ease" }}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Portfolio</span>
        <Wallet className="size-4 text-primary" />
      </div>
      <p className="text-2xl font-bold text-foreground">${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Monad Testnet · Live balance</p>
      {assets.length > 0 && (
        <>
          <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full">
            {assets.map((a, i) => (
              <div key={a.symbol} className={`${colors[i % colors.length]} transition-all`} style={{ width: `${a.allocation}%` }} title={`${a.symbol}: ${a.allocation}%`} />
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {assets.map((a, i) => (
              <div key={a.symbol} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${colors[i % colors.length]}`} />
                  <span className="font-medium">{a.symbol}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-semibold">{a.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{a.allocation}%</span>
                </div>
              </div>
            ))}
          </div>
          {assets.length > 0 && total > 0 && (
            <div className="mt-4">
              <DonutChart data={assets.map((a) => ({ name: a.symbol, value: a.allocation }))} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TransactionsCard({ transactions }: { transactions: { type: string; counterparty: string; amount: number; usdValue: number; asset: string; timestamp: string }[] }) {
  const recent = transactions.slice(0, 5);
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card" style={{ animation: "fadeSlideUp 0.4s ease" }}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Transactions</span>
        <span className="text-xs text-muted-foreground">{transactions.length} total</span>
      </div>
      {recent.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No transactions yet</p>
      ) : (
        <div className="divide-y divide-border">
          {recent.map((tx, i) => {
            const isIn = tx.type === "incoming";
            return (
              <div key={i} className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <span className={`grid size-8 place-items-center rounded-full ${isIn ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                    {isIn ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{tx.counterparty}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-mono text-sm font-semibold ${isIn ? "text-emerald-500" : "text-red-400"}`}>
                    {isIn ? "+" : "−"}${tx.usdValue.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{tx.asset}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnalyticsCard({ transactions, total }: { transactions: { type: string; usdValue: number; timestamp: string }[]; total: number }) {
  const income = transactions.filter((t) => t.type === "incoming").reduce((s, t) => s + t.usdValue, 0);
  const expenses = transactions.filter((t) => t.type !== "incoming").reduce((s, t) => s + t.usdValue, 0);
  const net = income - expenses;

  // Build last 6 months flow data
  const monthMap: Record<string, { income: number; expenses: number }> = {};
  transactions.forEach((t) => {
    const key = new Date(t.timestamp).toLocaleDateString("en-US", { month: "short" });
    if (!monthMap[key]) monthMap[key] = { income: 0, expenses: 0 };
    if (t.type === "incoming") monthMap[key]!.income += t.usdValue;
    else monthMap[key]!.expenses += t.usdValue;
  });
  const chartData = Object.entries(monthMap).slice(-6).map(([date, v]) => ({ date, ...v }));

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card" style={{ animation: "fadeSlideUp 0.4s ease" }}>
      <div className="border-b border-border px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financial Analytics</span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        {[
          { label: "Portfolio", value: `$${total.toFixed(2)}`, icon: Wallet, color: "text-primary" },
          { label: "Income", value: `$${income.toFixed(2)}`, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Expenses", value: `$${expenses.toFixed(2)}`, icon: TrendingDown, color: "text-red-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex flex-col items-center py-3">
            <Icon className={`size-4 ${color} mb-1`} />
            <p className={`text-sm font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className={`flex items-center justify-center gap-2 border-b border-border py-2 text-xs font-medium ${net >= 0 ? "text-emerald-500" : "text-red-400"}`}>
        {net >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
        Net flow: {net >= 0 ? "+" : ""}${net.toFixed(2)}
      </div>
      {chartData.length > 0 ? (
        <div className="p-3">
          <p className="mb-2 text-xs text-muted-foreground">Income vs Expenses</p>
          <FlowChart compact data={chartData} />
        </div>
      ) : (
        <p className="py-4 text-center text-xs text-muted-foreground">Not enough data for chart yet</p>
      )}
    </div>
  );
}

function InvoiceListCard({ onCreateInvoice }: { onCreateInvoice: () => void }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card" style={{ animation: "fadeSlideUp 0.4s ease" }}>
      <div className="border-b border-border px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoices</span>
      </div>
      <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
        <FileText className="size-10 text-primary/40" />
        <div>
          <p className="font-medium">No invoices yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Create your first invoice and I'll generate a payment link for you right here.</p>
        </div>
        <Button size="sm" onClick={onCreateInvoice}>
          <FileText className="size-4" /> Create Invoice
        </Button>
      </div>
    </div>
  );
}

function InvoiceLinkCard({ result }: { result: { id: string; paymentLink: string; title: string; amount: string; asset: string } }) {
  const copy = () => {
    navigator.clipboard?.writeText(result.paymentLink);
    toast.success("Payment link copied!");
  };
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/5" style={{ animation: "fadeSlideUp 0.4s ease" }}>
      <div className="flex items-center gap-2 border-b border-emerald-500/20 px-4 py-3">
        <CheckCircle2 className="size-4 text-emerald-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Invoice Created</span>
      </div>
      <div className="px-4 py-4">
        <p className="font-semibold">{result.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{result.amount} {result.asset}</p>
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-muted-foreground">Payment link</p>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
            <code className="flex-1 truncate text-xs text-primary">{result.paymentLink}</code>
            <button onClick={copy} className="shrink-0 rounded p-1 transition-colors hover:bg-border">
              <Copy className="size-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={copy} className="flex-1">
            <Copy className="size-3.5" /> Copy link
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(`/invoices`, "_blank")}>
            <ExternalLink className="size-3.5" /> View invoices
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline inputs ─────────────────────────────────────────────────────────────
function ChipsInput({ options, onSelect }: { options: string[]; onSelect: (v: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((opt) => (
        <button key={opt} onClick={() => onSelect(opt)} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary hover:text-primary-foreground">
          {opt}
        </button>
      ))}
    </div>
  );
}

function InlineInput({ field, onSubmit }: { field: InputField; onSubmit: (v: string) => void }) {
  const [val, setVal] = useState("");
  const submit = () => {
    const v = val.trim();
    if (field.required && !v) return;
    onSubmit(v || "—");
    setVal("");
  };
  return (
    <div className="mt-3 flex items-end gap-2">
      <Input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} placeholder={field.placeholder} value={val} autoFocus onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} className="max-w-xs" />
      <Button size="sm" onClick={submit} disabled={field.required && !val.trim()}>Continue</Button>
      {!field.required && <Button size="sm" variant="ghost" onClick={() => onSubmit("—")}>Skip</Button>}
    </div>
  );
}

// ─── Confirmation card ─────────────────────────────────────────────────────────
function ConfirmCard({ summary, question, onConfirm, onCancel }: { summary: Record<string, string>; question: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4" style={{ animation: "fadeSlideUp 0.3s ease" }}>
      <div className="mb-3 divide-y divide-border/50 rounded-md border border-border/60 bg-background/60">
        {Object.entries(summary).map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 px-3 py-2 text-sm">
            <span className="text-muted-foreground">{k}</span>
            <strong className="text-right">{v}</strong>
          </div>
        ))}
      </div>
      <p className="mb-3 text-sm font-medium">{question}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onConfirm}><CheckCircle2 className="size-3.5" /> Confirm</Button>
        <Button size="sm" variant="outline" onClick={onCancel}><X className="size-3.5" /> Cancel</Button>
      </div>
    </div>
  );
}

// ─── Chat bubble ───────────────────────────────────────────────────────────────
function ChatBubble({
  msg, flowState, walletData, transactions, onFlowInput, onConfirm, onCancel, onStartFlow,
}: {
  msg: ChatMessage;
  flowState: FlowState | null;
  walletData: ReturnType<typeof useWalletData>["data"];
  transactions: ReturnType<typeof useTransactions>["transactions"];
  onFlowInput: (v: string) => void;
  onConfirm: (msg: ChatMessage) => void;
  onCancel: (msg: ChatMessage) => void;
  onStartFlow: (id: string) => void;
}) {
  const isActiveStep = flowState?.activeMessageId === msg.id && !!msg.flowStep;
  const isActiveConfirm = !!msg.confirmation && !msg.confirmed && !msg.cancelled;

  if (msg.role === "user") {
    return (
      <div className="flex justify-end" style={{ animation: "fadeSlideUp 0.25s ease" }}>
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
          <p className="text-sm">{msg.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-3" style={{ animation: "fadeSlideUp 0.3s ease" }}>
      {/* Avatar */}
      <div className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-sm">
        <Sparkles className="size-3.5 text-primary-foreground" />
      </div>
      <div className="min-w-0 max-w-[85%]">
        <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-card/80 px-4 py-3 shadow-sm backdrop-blur-sm">
          <RenderText text={msg.text} />

          {/* Inline chart cards */}
          {!isActiveStep && !isActiveConfirm && !msg.confirmed && msg.cardType === "portfolio" && walletData && (
            <PortfolioCard assets={walletData.assets} total={walletData.totalBalance} />
          )}
          {!isActiveStep && !isActiveConfirm && !msg.confirmed && msg.cardType === "transactions" && (
            <TransactionsCard transactions={transactions} />
          )}
          {!isActiveStep && !isActiveConfirm && !msg.confirmed && msg.cardType === "analytics" && walletData && (
            <AnalyticsCard transactions={transactions} total={walletData.totalBalance} />
          )}
          {!isActiveStep && !isActiveConfirm && !msg.confirmed && msg.cardType === "invoice_list" && (
            <InvoiceListCard onCreateInvoice={() => onStartFlow("create_invoice")} />
          )}

          {/* Invoice payment link result */}
          {msg.invoiceResult && <InvoiceLinkCard result={msg.invoiceResult} />}

          {/* Flow input */}
          {isActiveStep && msg.flowStep && (
            msg.flowStep.field.type === "chips"
              ? <ChipsInput options={msg.flowStep.field.options ?? []} onSelect={onFlowInput} />
              : <InlineInput field={msg.flowStep.field} onSubmit={onFlowInput} />
          )}

          {/* Confirmation */}
          {isActiveConfirm && msg.confirmation && (
            <ConfirmCard summary={msg.confirmation.summary} question={msg.confirmation.confirmQuestion} onConfirm={() => onConfirm(msg)} onCancel={() => onCancel(msg)} />
          )}

          {msg.confirmed && !msg.invoiceResult && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-500"><CheckCircle2 className="size-3.5" /> Done — form is open</p>
          )}
          {msg.cancelled && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><X className="size-3.5" /> Cancelled</p>
          )}
        </div>
        <p className="mt-1 px-1 text-[10px] text-muted-foreground">{msg.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    </div>
  );
}

// ─── Welcome grid ──────────────────────────────────────────────────────────────
const quickCards = [
  { emoji: "📊", title: "Analytics", desc: "See your full breakdown", question: "Give me a financial summary." },
  { emoji: "💸", title: "Send Money", desc: "Transfer on Monad", flowId: "send_money" },
  { emoji: "🧾", title: "Create Invoice", desc: "Generate a payment link", flowId: "create_invoice" },
  { emoji: "🎁", title: "Send a Gift", desc: "Time-locked & programmable", flowId: "create_gift" },
];

// ─── Inline action modals ──────────────────────────────────────────────────────

function InlineInvoiceModal({ open, onOpenChange, prefill, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  prefill: Record<string, string>;
  onCreated: (result: { id: string; paymentLink: string; title: string; amount: string; asset: string }) => void;
}) {
  const { profile } = useProfile();
  const [form, setForm] = useState({
    clientName: prefill["clientName"] ?? "",
    clientEmail: prefill["clientEmail"] ?? "",
    title: prefill["title"] ?? "",
    amount: prefill["amount"] ?? "",
    asset: (prefill["asset"] ?? "USDC") as AssetSymbol,
    dueDate: prefill["dueDate"] ?? "",
    notes: prefill["notes"] !== "—" ? (prefill["notes"] ?? "") : "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!form.clientName || !form.amount || !form.dueDate) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const invoiceNumber = `INV-${Date.now().toString().slice(-5)}`;
      const invoiceId = crypto.randomUUID();
      const paymentLink = `https://plynt.vercel.app/invoices/${invoiceId}`;

      if (supabase && profile?.id) {
        const { error: dbErr } = await supabase.from("invoices").insert({
          id: invoiceId,
          profile_id: profile.id,
          number: invoiceNumber,
          client_name: form.clientName,
          client_email: form.clientEmail,
          title: form.title,
          description: form.description,
          amount: Number(form.amount),
          asset: form.asset,
          status: "pending",
          due_date: form.dueDate,
          notes: form.notes || null,
          payment_link: paymentLink,
          items: [],
        });
        if (dbErr) throw new Error(dbErr.message);
      }

      toast.success("Invoice created!", { description: `${form.title} · ${form.amount} ${form.asset}` });
      onCreated({ id: invoiceId, paymentLink, title: form.title, amount: form.amount, asset: form.asset });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🧾 Create invoice</DialogTitle>
          <DialogDescription>Pre-filled from your conversation. Review and create.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label>Client name *</Label><Input value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Client email *</Label><Input type="email" value={form.clientEmail} onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))} /></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label>Invoice title *</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Amount *</Label><Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></div>
            <div className="grid gap-1.5">
              <Label>Asset</Label>
              <Select value={form.asset} onValueChange={(v) => setForm((f) => ({ ...f, asset: v as AssetSymbol }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["USDC", "WETH", "MON"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Due date *</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} /></div>
          </div>
          <div className="grid gap-1.5"><Label>Description</Label><Textarea rows={2} className="resize-none" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <div className="grid gap-1.5"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          {!profile?.id && <p className="text-xs text-amber-600 dark:text-amber-400">⚠️ Sign in required to save invoices to your account.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !form.clientName || !form.amount}>
            {loading ? <RefreshCw className="size-4 animate-spin" /> : <FileText className="size-4" />}
            Create & get link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InlineGiftModal({ open, onOpenChange, prefill, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; prefill: Record<string, string>; onDone: () => void }) {
  const isRec = prefill["recurring"]?.toLowerCase().startsWith("yes");
  const [form, setForm] = useState({ recipient: prefill["recipient"] ?? "", amount: prefill["amount"] ?? "", asset: (prefill["asset"] ?? "USDC") as AssetSymbol, unlockDate: prefill["unlockDate"] ?? "", expirationDate: prefill["expirationDate"] !== "—" ? (prefill["expirationDate"] ?? "") : "", message: prefill["message"] !== "—" ? (prefill["message"] ?? "") : "", isRecurring: isRec, frequency: prefill["recurring"]?.includes("weekly") ? "weekly" : "monthly", recurrenceCount: "" });
  const [loading, setLoading] = useState(false);
  const handleCreate = async () => { setLoading(true); await new Promise((r) => setTimeout(r, 600)); setLoading(false); toast.success(`🎁 Gift scheduled for ${form.recipient}!`); onDone(); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>🎁 Create programmable gift</DialogTitle><DialogDescription>Pre-filled from your conversation.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2"><Label>Recipient</Label><Input value={form.recipient} onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Asset</Label><Select value={form.asset} onValueChange={(v) => setForm((f) => ({ ...f, asset: v as AssetSymbol }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["USDC", "MON", "WETH"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1.5"><Label>Unlock date</Label><Input type="date" value={form.unlockDate} onChange={(e) => setForm((f) => ({ ...f, unlockDate: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Expiry (optional)</Label><Input type="date" value={form.expirationDate} onChange={(e) => setForm((f) => ({ ...f, expirationDate: e.target.value }))} /></div>
          </div>
          <div className="grid gap-1.5"><Label>Message (optional)</Label><Textarea rows={2} className="resize-none" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} /></div>
          <div className="flex items-center gap-3"><Switch id="rec" checked={form.isRecurring} onCheckedChange={(v) => setForm((f) => ({ ...f, isRecurring: v }))} /><Label htmlFor="rec">Recurring gift</Label></div>
          {form.isRecurring && (
            <div className="grid grid-cols-2 gap-3 border-l-2 border-primary/30 pl-4">
              <div className="grid gap-1.5"><Label>Frequency</Label><Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="biweekly">Biweekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select></div>
              <div className="grid gap-1.5"><Label>Times</Label><Input type="number" placeholder="e.g. 12" value={form.recurrenceCount} onChange={(e) => setForm((f) => ({ ...f, recurrenceCount: e.target.value }))} /></div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !form.recipient || !form.amount || !form.unlockDate}>{loading ? <RefreshCw className="size-4 animate-spin" /> : <Gift className="size-4" />} Send gift</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InlineSalaryModal({ open, onOpenChange, prefill, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; prefill: Record<string, string>; onDone: () => void }) {
  const [form, setForm] = useState({ salary: prefill["salary"] ?? "", asset: (prefill["asset"] ?? "USDC") as AssetSymbol, personal: prefill["personal"] ?? "60", savings: prefill["savings"] ?? "20", rent: prefill["rent"] ?? "10", family: prefill["family"] ?? "10" });
  const [loading, setLoading] = useState(false);
  const total = [form.personal, form.savings, form.rent, form.family].reduce((s, v) => s + Number(v), 0);
  const handleSave = async () => { if (total !== 100) { toast.error("Percentages must total 100%"); return; } setLoading(true); await new Promise((r) => setTimeout(r, 600)); setLoading(false); toast.success("💼 Salary distribution saved!"); onDone(); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>💼 Salary distribution</DialogTitle><DialogDescription>Total must equal 100%.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Monthly salary</Label><Input type="number" value={form.salary} onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Asset</Label><Select value={form.asset} onValueChange={(v) => setForm((f) => ({ ...f, asset: v as AssetSymbol }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["USDC", "WETH", "MON"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
          </div>
          {([["Personal", "personal"], ["Savings", "savings"], ["Rent", "rent"], ["Family", "family"]] as [string, keyof typeof form][]).map(([label, key]) => (
            <div key={key} className="flex items-center gap-4">
              <Label className="w-24 shrink-0">{label} %</Label>
              <Input type="number" min={0} max={100} className="max-w-[90px]" value={form[key] as string} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
              <span className="text-sm text-muted-foreground">→ ${((Number(form.salary) * Number(form[key])) / 100).toFixed(0)}</span>
            </div>
          ))}
          <div className={`text-sm font-medium ${total === 100 ? "text-primary" : "text-destructive"}`}>Total: {total}% {total === 100 ? "✓" : `— needs ${100 - total}% more`}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || total !== 100}>{loading ? <RefreshCw className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Save distribution</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Welcome message ────────────────────────────────────────────────────────────
const WELCOME: ChatMessage = {
  id: "welcome", role: "assistant",
  text: "Hey there! 👋 I'm your PLYNT AI Assistant — your smart finance companion on Monad.\n\nAsk me anything about your wallet, or pick an action below and I'll guide you step by step. Everything happens right here — no page switching needed! 🚀",
  ts: new Date(), cardType: "none",
};

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function AssistantPage() {
  const { data: walletData } = useWalletData();
  const { transactions } = useTransactions();

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [flowState, setFlowState] = useState<FlowState | null>(null);
  const [freeInput, setFreeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("actions");
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendPrefill, setSendPrefill] = useState<Record<string, string>>({});
  const [receiveOpen, setReceiveOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const addMsg = (msg: Omit<ChatMessage, "id" | "ts">): ChatMessage => {
    const m: ChatMessage = { ...msg, id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, ts: new Date() };
    setMessages((prev) => [...prev, m]);
    return m;
  };
  const updateMsg = (id: string, patch: Partial<ChatMessage>) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const startFlow = (flowId: string) => {
    const flow = flows[flowId];
    if (!flow) return;
    addMsg({ role: "user", text: flow.title });
    const firstStep = flow.steps[0]!;
    const am = addMsg({ role: "assistant", text: firstStep.message, flowStep: firstStep, flowId });
    setFlowState({ flowId, stepIndex: 0, data: {}, activeMessageId: am.id });
    setSuggestionsOpen(false);
  };

  const handleFlowInput = (value: string) => {
    if (!flowState) return;
    const flow = flows[flowState.flowId];
    if (!flow) return;
    const step = flow.steps[flowState.stepIndex];
    if (!step) return;
    updateMsg(flowState.activeMessageId, { flowStep: undefined });
    addMsg({ role: "user", text: value });
    const newData = { ...flowState.data, [step.field.key]: value };
    const nextIdx = flowState.stepIndex + 1;
    if (nextIdx < flow.steps.length) {
      const nextStep = flow.steps[nextIdx]!;
      const am = addMsg({ role: "assistant", text: nextStep.message, flowStep: nextStep, flowId: flowState.flowId });
      setFlowState({ ...flowState, stepIndex: nextIdx, data: newData, activeMessageId: am.id });
    } else {
      const summary = flow.buildConfirmSummary(newData);
      const am = addMsg({ role: "assistant", text: "Here's a summary of what you've entered — looks good? 👀", confirmation: { summary, flowTitle: flow.title, confirmQuestion: flow.confirmQuestion, data: newData, flowId: flowState.flowId }, flowId: flowState.flowId });
      setFlowState({ ...flowState, stepIndex: nextIdx, data: newData, activeMessageId: am.id });
    }
  };

  const handleConfirm = (msg: ChatMessage) => {
    if (!msg.confirmation) return;
    const flow = flows[msg.confirmation.flowId];
    if (!flow) return;
    updateMsg(msg.id, { confirmed: true });
    setFlowState(null);
    const trigger = flow.modal(msg.confirmation.data);
    if (trigger.type === "send") { setSendPrefill(trigger.prefill); setSendOpen(true); }
    else setActiveModal(trigger as ActiveModal);
  };

  const handleCancel = (msg: ChatMessage) => {
    updateMsg(msg.id, { cancelled: true });
    addMsg({ role: "assistant", text: "No worries — cancelled! 👍 What else can I help you with?" });
    setFlowState(null);
  };

  const askQuestion = async (text: string) => {
    if (loading) return;
    addMsg({ role: "user", text });
    const lower = text.toLowerCase();
    if (lower.includes("receive") || lower.includes("my address") || lower.includes("show qr") || lower.includes("deposit") || lower.includes("fund my wallet") || lower.includes("get paid")) {
      addMsg({ role: "assistant", text: `📋 Opening your receive panel now — share your address to get paid!\n\nYour address: \`${walletData?.address ?? "sign in to see"}\``, cardType: "none" });
      setReceiveOpen(true);
      return;
    }
    setLoading(true);
    setSuggestionsOpen(false);
    const result = await assistantService.sendMessage(text, {
      walletAddress: walletData?.address,
      totalBalance: walletData?.totalBalance,
      assets: walletData?.assets,
      transactions: transactions.map((t) => ({ type: t.type, counterparty: t.counterparty, amount: t.amount, usdValue: t.usdValue, asset: t.asset, timestamp: t.timestamp, status: t.status })),
    });
    addMsg({ role: "assistant", text: result.content, cardType: result.cardType });
    setLoading(false);
  };

  const handleChip = (chip: ChipDef) => {
    if (typeof chip === "string") askQuestion(chip);
    else startFlow(chip.flowId);
  };

  const handleFreeSubmit = () => {
    const text = freeInput.trim();
    if (!text || loading) return;
    setFreeInput("");
    const lower = text.toLowerCase();
    if (lower.includes("create invoice") || lower.includes("new invoice")) return startFlow("create_invoice");
    if (lower.includes("send money") || (lower.includes("send ") && lower.includes("usdc")) || (lower.includes("send ") && lower.includes("mon"))) return startFlow("send_money");
    if (lower.includes("create a gift") || lower.includes("send a gift") || lower.includes("programmable gift")) return startFlow("create_gift");
    if (lower.includes("salary distribution") || lower.includes("split my salary")) return startFlow("set_salary_distribution");
    askQuestion(text);
  };

  const activeCat = categories.find((c) => c.id === activeCategory);
  const isWelcome = messages.length === 1;

  // Flow step count for progress indicator
  const currentFlow = flowState ? flows[flowState.flowId] : null;
  const totalSteps = currentFlow ? currentFlow.steps.length : 0;

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink { 0%,80%,100% { opacity: 0; } 40% { opacity: 1; } }
      `}</style>

      <div className="mx-auto flex max-w-3xl flex-col" style={{ height: "calc(100vh - 9rem)" }}>
        {/* Header */}
        <div className="mb-4 flex items-center gap-3" style={{ animation: "fadeSlideUp 0.3s ease" }}>
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-md">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Everything in one place — no page switching</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background/60 shadow-sm backdrop-blur-sm">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
            {/* Welcome quick cards */}
            {isWelcome && (
              <div className="mb-6 grid grid-cols-2 gap-3" style={{ animation: "fadeSlideUp 0.4s ease 0.1s both" }}>
                {quickCards.map((card) => (
                  <button
                    key={card.title}
                    onClick={() => card.flowId ? startFlow(card.flowId) : askQuestion(card.question!)}
                    className="group flex flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <span className="text-2xl">{card.emoji}</span>
                    <span className="font-semibold text-sm">{card.title}</span>
                    <span className="text-xs text-muted-foreground">{card.desc}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  msg={msg}
                  flowState={flowState}
                  walletData={walletData}
                  transactions={transactions}
                  onFlowInput={handleFlowInput}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                  onStartFlow={startFlow}
                />
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex justify-start gap-3" style={{ animation: "fadeSlideUp 0.2s ease" }}>
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60">
                    <Sparkles className="size-3.5 text-primary-foreground" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-card/80 px-4 py-3">
                    <div className="flex items-center gap-1">
                      {[0, 150, 300].map((delay) => (
                        <span key={delay} className="size-1.5 rounded-full bg-primary" style={{ animation: `blink 1.2s ${delay}ms infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Suggestions */}
          {!flowState && (
            <div className="border-t border-border">
              <button className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground" onClick={() => setSuggestionsOpen((o) => !o)}>
                <span className="flex items-center gap-1.5"><Sparkles className="size-3 text-primary" />Suggestions</span>
                <span className="text-[10px]">{suggestionsOpen ? "▲" : "▼"}</span>
              </button>
              {suggestionsOpen && (
                <div className="px-4 pb-3">
                  <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                    {categories.map((cat) => (
                      <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${activeCategory === cat.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
                        <cat.icon className="size-3" />{cat.label}
                      </button>
                    ))}
                  </div>
                  {activeCat && (
                    <div className="flex flex-wrap gap-1.5">
                      {activeCat.chips.map((chip) => {
                        const text = typeof chip === "string" ? chip : chip.text;
                        const isAction = typeof chip !== "string";
                        return (
                          <button key={text} onClick={() => handleChip(chip)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all hover:border-primary/60 ${isAction ? "border-primary/30 bg-primary/8 font-medium text-primary" : "border-border bg-muted/40 text-foreground hover:bg-muted"}`}>
                            {isAction && <Zap className="size-3" />}{text}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Input bar */}
          <div className="border-t border-border p-3">
            {flowState && currentFlow && (
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-primary">
                  <Zap className="size-3" />
                  {currentFlow.title} · Step {Math.min(flowState.stepIndex + 1, totalSteps)}/{totalSteps}
                </span>
                <button className="text-muted-foreground hover:text-destructive" onClick={() => { addMsg({ role: "assistant", text: "Flow cancelled. What else can I help with? 👋" }); setFlowState(null); }}>
                  ✕ Cancel
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={freeInput}
                onChange={(e) => setFreeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleFreeSubmit(); } }}
                placeholder={flowState ? "Answer the question above…" : "Ask anything or describe what you want to do…"}
                disabled={!!flowState || loading}
                className="flex-1 rounded-full bg-muted/40"
              />
              <Button size="icon" className="size-9 shrink-0 rounded-full" onClick={handleFreeSubmit} disabled={!!flowState || loading || !freeInput.trim()}>
                <ArrowUp className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Modals */}
        <SendDialog open={sendOpen} onOpenChange={setSendOpen} assets={walletData?.assets ?? []} initialDraft={sendPrefill["recipient"] ? { recipient: sendPrefill["recipient"], amount: Number(sendPrefill["amount"]) || 0, asset: (sendPrefill["asset"] ?? "USDC") as AssetSymbol, fee: 0.000021, memo: sendPrefill["memo"] !== "—" ? sendPrefill["memo"] : undefined } : undefined} />
        <ReceiveDialog open={receiveOpen} onOpenChange={setReceiveOpen} />

        {activeModal?.type === "invoice" && (
          <InlineInvoiceModal
            open
            onOpenChange={(o) => !o && setActiveModal(null)}
            prefill={activeModal.prefill}
            onCreated={(result) => {
              setActiveModal(null);
              // Find the last confirmed message and attach the invoice result
              setMessages((prev) => {
                const idx = [...prev].reverse().findIndex((m) => m.confirmed && !m.invoiceResult);
                if (idx === -1) {
                  // Just add a new message
                  return [...prev, {
                    id: `m-inv-${Date.now()}`, role: "assistant" as const,
                    text: `✅ Invoice created! Here's your payment link — share it with your client to get paid 💸`,
                    ts: new Date(), cardType: "none" as const, invoiceResult: result,
                  }];
                }
                const realIdx = prev.length - 1 - idx;
                return prev.map((m, i) => i === realIdx ? { ...m, invoiceResult: result } : m);
              });
            }}
          />
        )}
        {activeModal?.type === "gift" && (
          <InlineGiftModal open onOpenChange={(o) => !o && setActiveModal(null)} prefill={activeModal.prefill} onDone={() => { setActiveModal(null); addMsg({ role: "assistant", text: `🎁 Gift scheduled! Your recipient can claim it on the unlock date you set. You can track it in the Gifts section.`, cardType: "none" }); }} />
        )}
        {activeModal?.type === "salary" && (
          <InlineSalaryModal open onOpenChange={(o) => !o && setActiveModal(null)} prefill={activeModal.prefill} onDone={() => { setActiveModal(null); addMsg({ role: "assistant", text: `💼 Salary distribution saved! Your income will be automatically split according to your rules. Check the Salary section any time to adjust.`, cardType: "none" }); }} />
        )}
      </div>
    </>
  );
}
