import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check, CopyPlus, ExternalLink, FilePlus2, Link2,
  Loader2, MoreHorizontal, ReceiptText, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageIntro, EmptyState, IconButton } from "@/components/shared/common";
import { MonLogo } from "@/components/shared/mon-logo";
import { Reveal } from "@/components/shared/motion";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { invoiceService } from "@/services/invoiceService";
import { useProfile } from "@/hooks/use-profile";
import type { Invoice, InvoiceStatus } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — PLYNT" },
      { name: "description", content: "Create, share, and track Monad payment invoices." },
      { property: "og:title", content: "Invoices — PLYNT" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvoicesLayout,
});

// ─── Layout wrapper — renders child routes (/invoices/$id) or the list ────────
function InvoicesLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChild = pathname !== "/invoices" && pathname.startsWith("/invoices/");
  return isChild ? <Outlet /> : <InvoicesPage />;
}

// ─── Inline status badge — fully responsive ───────────────────────────────────
const STATUS_CFG: Record<InvoiceStatus, { label: string; cls: string }> = {
  draft:   { label: "Draft",   cls: "bg-muted text-muted-foreground border-border" },
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800" },
  paid:    { label: "Paid",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800" },
  overdue: { label: "Overdue", cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800" },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", cfg.cls)}>
      <span className="size-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}

// ─── Create modal wrapper ─────────────────────────────────────────────────────
function CreateInvoiceModal({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create invoice</DialogTitle>
          <DialogDescription>Build a payment request payable in MON on Monad.</DialogDescription>
        </DialogHeader>
        <InvoiceForm onSuccess={onCreated} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

// ─── Invoice row ──────────────────────────────────────────────────────────────
function InvoiceRow({
  invoice,
  onMarkPaid,
  onDuplicate,
  onDelete,
}: {
  invoice: Invoice;
  onMarkPaid: (i: Invoice) => void;
  onDuplicate: (i: Invoice) => void;
  onDelete: (i: Invoice) => void;
}) {
  const nav = useNavigate();

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if the dropdown trigger was clicked
    const target = e.target as HTMLElement;
    if (target.closest("[data-dropdown]")) return;
    nav({ to: "/invoices/$id", params: { id: invoice.id } });
  };

  const paymentLink = invoice.paymentLink
    ? (invoice.paymentLink.startsWith("http") ? invoice.paymentLink : `https://${invoice.paymentLink}`)
    : `https://plyntpays.vercel.app/pay/${invoice.number}`;

  return (
    <div
      onClick={handleRowClick}
      className="invoice-row group cursor-pointer hover:bg-muted/40 transition-colors"
    >
      {/* Invoice number */}
      <span className="font-mono text-sm font-medium text-primary group-hover:underline">
        {invoice.number}
      </span>

      {/* Client */}
      <div className="min-w-0">
        <p className="truncate font-medium">{invoice.clientName}</p>
        <p className="truncate text-xs text-muted-foreground">{invoice.title}</p>
      </div>

      {/* Amount */}
      <div className="flex items-center gap-1.5">
        <MonLogo size="xs" showText={false} />
        <span className="font-mono text-sm">
          ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Due date */}
      <p className="hidden text-sm text-muted-foreground md:block">
        {new Date(invoice.dueDate).toLocaleDateString()}
      </p>

      {/* Status — always visible */}
      <StatusBadge status={invoice.status} />

      {/* Actions */}
      <div data-dropdown onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label="More options">
              <MoreHorizontal />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => nav({ to: "/invoices/$id", params: { id: invoice.id } })}>
              <ExternalLink className="size-4" />
              Open invoice
            </DropdownMenuItem>
            {invoice.status !== "paid" && (
              <DropdownMenuItem onClick={() => onMarkPaid(invoice)}>
                <Check className="size-4" />
                Mark as paid
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onDuplicate(invoice)}>
              <CopyPlus className="size-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard?.writeText(paymentLink);
                toast.success("Payment link copied", { description: paymentLink });
              }}
            >
              <Link2 className="size-4" />
              Copy payment link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(invoice)}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Main list page ───────────────────────────────────────────────────────────
function InvoicesPage() {
  const [tab, setTab] = useState("all");
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [remove, setRemove] = useState<Invoice>();
  const [createOpen, setCreateOpen] = useState(false);
  const { profile } = useProfile();

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await invoiceService.getInvoices(profile?.id);
      setRows(data);
    } catch (e) {
      toast.error("Failed to load invoices", { description: e instanceof Error ? e.message : "Unknown" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await invoiceService.getInvoices(profile?.id);
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) toast.error("Failed to load invoices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.id]);

  const filtered = useMemo(
    () => (tab === "all" ? rows : rows.filter((i) => i.status === tab)),
    [rows, tab],
  );

  const totals = [
    { label: "Total invoiced", value: rows.reduce((s, i) => s + i.amount, 0) },
    { label: "Paid",           value: rows.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0) },
    { label: "Pending",        value: rows.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0) },
    { label: "Overdue",        value: rows.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0) },
  ];

  const handleMarkPaid = async (invoice: Invoice) => {
    try {
      await invoiceService.updateInvoice(invoice.id, { status: "paid" }, profile?.id);
      setRows((r) => r.map((i) => (i.id === invoice.id ? { ...i, status: "paid" } : i)));
      toast.success("Invoice marked as paid");
    } catch { toast.error("Failed to update invoice"); }
  };

  const handleDuplicate = async (invoice: Invoice) => {
    if (!profile?.id) return;
    try {
      const dup: Invoice = {
        ...invoice,
        id: crypto.randomUUID(),
        number: `INV-${Date.now().toString().slice(-6)}`,
        status: "draft",
        paymentLink: `plyntpays.vercel.app/pay/INV-${Date.now().toString().slice(-6)}`,
        createdAt: new Date().toISOString(),
      };
      const created = await invoiceService.createInvoice(dup, profile.id);
      setRows((r) => [created, ...r]);
      toast.success("Invoice duplicated", { description: `${created.number} created as draft` });
    } catch { toast.error("Failed to duplicate invoice"); }
  };

  const handleDelete = async () => {
    if (!remove) return;
    try {
      await invoiceService.deleteInvoice(remove.id, profile?.id);
      setRows((r) => r.filter((i) => i.id !== remove.id));
      toast.success("Invoice deleted");
    } catch (e) {
      toast.error("Failed to delete", { description: e instanceof Error ? e.message : "Unknown" });
    } finally {
      setRemove(undefined);
    }
  };

  return (
    <div className="space-y-7">
      <Reveal>
        <PageIntro
          title="Invoices"
          description="Create and track MON payment requests."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <FilePlus2 />
              Create invoice
            </Button>
          }
        />
      </Reveal>

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Reveal delay={40}>
          <EmptyState
            icon={ReceiptText}
            title="No invoices yet"
            description="Create your first invoice to request payment in MON on Monad."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <FilePlus2 /> Create invoice
              </Button>
            }
          />
        </Reveal>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {totals.map((item, i) => (
              <Reveal key={item.label} delay={i * 45}>
                <section className="stat-card">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-4 text-2xl font-semibold">
                    ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </section>
              </Reveal>
            ))}
          </div>

          {/* Filter tabs */}
          <Reveal>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="h-auto max-w-full justify-start overflow-x-auto">
                {(["all", "draft", "pending", "paid", "overdue"] as const).map((s) => (
                  <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </Reveal>

          {/* Table */}
          <Reveal>
            {filtered.length === 0 ? (
              <EmptyState icon={ReceiptText} title="No invoices found" description="No invoices match this filter." />
            ) : (
              <div className="overflow-hidden rounded-md border border-border">
                {/* Header — hidden on mobile */}
                <div className="hidden grid-cols-[100px_1fr_130px_120px_110px_48px] bg-muted px-4 py-3 text-xs font-medium text-muted-foreground md:grid">
                  <span>Invoice</span>
                  <span>Client</span>
                  <span>Amount</span>
                  <span>Due date</span>
                  <span>Status</span>
                  <span />
                </div>
                {filtered.map((invoice) => (
                  <InvoiceRow
                    key={invoice.id}
                    invoice={invoice}
                    onMarkPaid={handleMarkPaid}
                    onDuplicate={handleDuplicate}
                    onDelete={setRemove}
                  />
                ))}
              </div>
            )}
          </Reveal>
        </>
      )}

      {/* Create modal */}
      <CreateInvoiceModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => { setCreateOpen(false); loadInvoices(); }}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!remove} onOpenChange={(open) => !open && setRemove(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {remove?.number}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the invoice.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
