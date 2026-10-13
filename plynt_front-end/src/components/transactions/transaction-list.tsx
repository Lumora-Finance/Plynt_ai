import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  ExternalLink,
  Gift,
  Repeat2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TransactionStatusBadge } from "@/components/shared/status";
import { currency } from "@/components/shared/common";
import type { OnChainTransaction } from "@/hooks/use-transactions";
import { PLATFORM_FEE_RATE } from "@/services/transactionService";

type Tx = OnChainTransaction;

const TYPE_ICON: Record<string, React.ElementType> = {
  incoming: ArrowDownLeft,
  outgoing: ArrowUpRight,
  payment: CreditCard,
  swap: Repeat2,
  gift: Gift,
  invoice: CreditCard,
  convert: DollarSign,
};

const TYPE_LABEL: Record<string, string> = {
  incoming: "Received",
  outgoing: "Sent",
  payment: "Payment",
  swap: "Swap",
  gift: "Gift",
  invoice: "Invoice",
  convert: "Convert",
};

function TxIcon({ type }: { type: string }) {
  const Icon = TYPE_ICON[type] ?? ArrowLeftRight;
  const isIn = type === "incoming";
  return (
    <span
      className={`grid size-9 shrink-0 place-items-center rounded-md text-sm ${
        isIn
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-secondary text-primary"
      }`}
    >
      <Icon className="size-4" />
    </span>
  );
}

export function TransactionList({
  transactions,
  limit,
  onViewAll,
}: {
  transactions: Tx[];
  limit?: number;
  onViewAll?: () => void;
}) {
  const [selected, setSelected] = useState<Tx | undefined>();
  const rows = limit ? transactions.slice(0, limit) : transactions;

  if (rows.length === 0) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">No transactions yet.</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop table ── */}
      <div className="hidden overflow-hidden rounded border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Transaction</th>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((tx) => (
              <tr
                key={tx.id}
                className="cursor-pointer transition-colors hover:bg-muted/40"
                onClick={() => setSelected(tx)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <TxIcon type={tx.type} />
                    <div>
                      <p className="font-medium">{TYPE_LABEL[tx.type] ?? tx.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.counterparty} · {new Date(tx.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{tx.asset}</td>
                <td className="px-4 py-3">
                  <TransactionStatusBadge status={tx.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <p
                    className={`font-mono font-semibold ${
                      tx.type === "incoming"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : ""
                    }`}
                  >
                    {tx.type === "incoming" ? "+" : "−"}
                    {currency(tx.usdValue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {tx.asset}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="space-y-2 md:hidden">
        {rows.map((tx) => (
          <button
            key={tx.id}
            onClick={() => setSelected(tx)}
            className="flex w-full items-center gap-3 rounded border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
          >
            <TxIcon type={tx.type} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{tx.counterparty}</span>
              <span className="text-xs text-muted-foreground">
                {TYPE_LABEL[tx.type] ?? tx.type} · {tx.asset} ·{" "}
                {new Date(tx.timestamp).toLocaleDateString()}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span
                className={`block font-mono text-sm font-semibold ${
                  tx.type === "incoming"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : ""
                }`}
              >
                {tx.type === "incoming" ? "+" : "−"}
                {currency(tx.usdValue)}
              </span>
              <TransactionStatusBadge status={tx.status} />
            </span>
          </button>
        ))}
      </div>

      {onViewAll && (
        <Button variant="ghost" className="mt-3 w-full" onClick={onViewAll}>
          View all transactions
        </Button>
      )}

      <TransactionDialog transaction={selected} onClose={() => setSelected(undefined)} />
    </>
  );
}

export function TransactionDialog({
  transaction,
  onClose,
}: {
  transaction: Tx | undefined;
  onClose: () => void;
}) {
  if (!transaction) return null;

  const rows: [string, string][] = [
    ["Type", TYPE_LABEL[transaction.type] ?? transaction.type],
    ["Status", transaction.status],
    ["Amount", `${transaction.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${transaction.asset}`],
    ["USD value", currency(transaction.usdValue)],
    ["Platform fee", `${transaction.platform_fee.toFixed(6)} ${transaction.asset} (${(PLATFORM_FEE_RATE * 100).toFixed(1)}%)`],
    ["Counterparty", transaction.counterparty],
  ];
  if (transaction.from_address) rows.push(["From", transaction.from_address]);
  if (transaction.to_address) rows.push(["To", transaction.to_address]);
  rows.push(["Date", new Date(transaction.timestamp).toLocaleString()]);
  if (transaction.memo) rows.push(["Memo", transaction.memo]);
  if (transaction.hash) rows.push(["Tx hash", transaction.hash.slice(0, 14) + "…" + transaction.hash.slice(-6)]);

  return (
    <Dialog open={!!transaction} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TxIcon type={transaction.type} />
            Transaction details
          </DialogTitle>
          <DialogDescription>On-chain Monad activity</DialogDescription>
        </DialogHeader>
        <div className="detail-list">
          {rows.map(([k, v]) => (
            <div key={k}>
              <span>{k}</span>
              <strong className="max-w-[60%] break-all text-right text-sm">{v}</strong>
            </div>
          ))}
          {transaction.explorerUrl && (
            <Button asChild className="mt-2 w-full">
              <a href={transaction.explorerUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                View on Monad Explorer
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
