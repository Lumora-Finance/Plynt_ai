import { useMemo, useState } from "react";
import { ArrowLeftRight, Eye, Plus, Save, Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InvoicePreview } from "./invoice-preview";
import { MonLogo } from "@/components/shared/mon-logo";
import { invoiceService } from "@/services/invoiceService";
import { useProfile } from "@/hooks/use-profile";
import type { InvoiceDraft, InvoiceItem } from "@/types";

// MON price in USD — keep in sync with use-wallet-data.ts
const MON_PRICE_USD = 0.189;

const blank = (): InvoiceItem => ({ id: crypto.randomUUID(), description: "", quantity: 1, rate: 0 });

function Field({
  label,
  id,
  children,
  className = "",
}: {
  label: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className={label ? "mt-1.5" : ""}>{children}</div>
    </div>
  );
}

interface InvoiceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function InvoiceForm({ onSuccess, onCancel }: InvoiceFormProps = {}) {
  const nav = useNavigate();
  const { profile, loading: profileLoading } = useProfile();

  const [draft, setDraft] = useState<InvoiceDraft>({
    clientName: "",
    clientEmail: "",
    title: "",
    description: "",
    asset: "MON",
    dueDate: "",
    number: `INV-${Date.now().toString().slice(-6)}`,
    notes: "",
    items: [blank()],
  });
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Total in USDC (what user inputs in rates)
  const totalUsdc = useMemo(
    () => draft.items.reduce((s, i) => s + i.quantity * i.rate, 0),
    [draft.items],
  );

  // Live MON equivalent
  const totalMon = MON_PRICE_USD > 0 ? totalUsdc / MON_PRICE_USD : 0;

  const update = (key: keyof InvoiceDraft, value: unknown) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const updateItem = (id: string, key: keyof InvoiceItem, value: string | number) =>
    update("items", draft.items.map((i) => (i.id === id ? { ...i, [key]: value } : i)));

  const validate = () => {
    const next: string[] = [];
    if (!draft.clientName.trim()) next.push("Client name is required.");
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(draft.clientEmail)) next.push("Enter a valid client email.");
    if (!draft.title.trim()) next.push("Invoice title is required.");
    if (!draft.dueDate) next.push("Due date is required.");
    if (totalUsdc <= 0) next.push("Add at least one line item with a rate greater than 0.");
    setErrors(next);
    return next.length === 0;
  };

  const save = async (status: "draft" | "pending") => {
    if (!validate()) return;
    if (!profile?.id) {
      toast.error("Sign in required", { description: "You need to be signed in to save invoices." });
      return;
    }
    setLoading(true);
    try {
      const invoice = await invoiceService.createInvoice(
        {
          id: crypto.randomUUID(),
          number: draft.number,
          clientName: draft.clientName,
          clientEmail: draft.clientEmail,
          title: draft.title,
          description: draft.description ?? "",
          amount: totalUsdc,
          asset: "MON",
          status,
          dueDate: draft.dueDate,
          ...(draft.notes ? { notes: draft.notes } : {}),
          paymentLink: `plyntpays.vercel.app/pay/${draft.number}`,
          items: draft.items,
          createdAt: new Date().toISOString(),
        },
        profile.id,
      );
      toast.success(status === "draft" ? "Draft saved" : "Invoice created!", {
        description: `${invoice.number} · $${totalUsdc.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC (≈ ${totalMon.toLocaleString(undefined, { maximumFractionDigits: 2 })} MON)`,
      });
      if (onSuccess) onSuccess();
      else nav({ to: "/invoices" });
    } catch (e) {
      toast.error("Failed to save invoice", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  const previewInvoice = {
    ...draft,
    id: "preview",
    amount: totalUsdc,
    asset: "MON" as const,
    status: "draft" as const,
    createdAt: new Date().toISOString().slice(0, 10),
    paymentLink: `plyntpays.vercel.app/pay/${draft.number}`,
  };

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="panel space-y-6">
          {/* Client & invoice info */}
          <div>
            <h2 className="section-title">Client & invoice</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Client name" id="clientName">
                <Input id="clientName" value={draft.clientName} onChange={(e) => update("clientName", e.target.value)} placeholder="Acme Studio" />
              </Field>
              <Field label="Client email" id="clientEmail">
                <Input id="clientEmail" type="email" value={draft.clientEmail} onChange={(e) => update("clientEmail", e.target.value)} placeholder="finance@client.com" />
              </Field>
              <Field label="Invoice title" id="title">
                <Input id="title" value={draft.title} onChange={(e) => update("title", e.target.value)} placeholder="Product design retainer" />
              </Field>
              <Field label="Invoice number" id="number">
                <Input id="number" value={draft.number} onChange={(e) => update("number", e.target.value)} />
              </Field>
              <Field label="Due date" id="dueDate">
                <Input id="dueDate" type="date" value={draft.dueDate} onChange={(e) => update("dueDate", e.target.value)} />
              </Field>
              {/* Asset — MON only, no select needed */}
              <div className="grid gap-1.5">
                <Label>Asset</Label>
                <div className="mt-1.5 flex h-10 items-center gap-2 rounded-md border border-border bg-muted/40 px-3">
                  <MonLogo size="sm" />
                  <span className="text-sm font-medium">MON — Monad</span>
                  <span className="ml-auto text-xs text-muted-foreground">Only asset</span>
                </div>
              </div>
            </div>
            <Field label="Description" id="description" className="mt-4">
              <Textarea id="description" value={draft.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the work or request" />
            </Field>
          </div>

          {/* Line items — rates entered in USDC */}
          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title">Line items</h2>
                <p className="text-xs text-muted-foreground">Enter rates in <strong>USDC</strong> — MON equivalent calculated automatically</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => update("items", [...draft.items, blank()])}>
                <Plus /> Add item
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {draft.items.map((item, index) => (
                <div key={item.id} className="grid gap-3 border border-border p-3 sm:grid-cols-[1fr_90px_140px_40px]">
                  <Field label={index === 0 ? "Description" : ""} id={`item-${item.id}`}>
                    <Input id={`item-${item.id}`} value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} placeholder="Service or deliverable" />
                  </Field>
                  <Field label={index === 0 ? "Qty" : ""} id={`qty-${item.id}`}>
                    <Input id={`qty-${item.id}`} type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))} />
                  </Field>
                  <Field label={index === 0 ? "Rate (USDC)" : ""} id={`rate-${item.id}`}>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input id={`rate-${item.id}`} type="number" min="0" step="0.01" value={item.rate || ""} onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))} className="pl-6" />
                    </div>
                  </Field>
                  <Button variant="ghost" size="icon" aria-label="Delete line item" className={index === 0 ? "sm:mt-6" : ""} disabled={draft.items.length === 1} onClick={() => update("items", draft.items.filter((i) => i.id !== item.id))}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <Field label="Notes" id="notes">
            <Textarea id="notes" value={draft.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Payment terms or a short thank-you note" />
          </Field>

          {/* Errors */}
          {errors.length > 0 && (
            <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
              {errors.map((e) => <p key={e} className="text-sm text-destructive">{e}</p>)}
            </div>
          )}

          {!profile?.id && !profileLoading && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
              ⚠️ You need to be signed in to save invoices.
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="panel h-fit xl:sticky xl:top-24 space-y-5">
          {/* USDC total */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Invoice amount</p>
            <p className="mt-1.5 text-3xl font-semibold">
              ${totalUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">USDC</p>
          </div>

          {/* MON equivalent */}
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
            <ArrowLeftRight className="size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">MON equivalent</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MonLogo size="xs" />
                <span className="font-mono font-semibold text-sm">
                  {totalMon > 0
                    ? totalMon.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : "—"} MON
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">@ $0.189 / MON</p>
            </div>
          </div>

          {/* Payment link preview */}
          <div>
            <p className="text-xs text-muted-foreground">Payment link</p>
            <p className="mt-1 truncate font-mono text-xs text-primary">
              plyntpays.vercel.app/pay/{draft.number}
            </p>
          </div>

          <div className="space-y-2">
            <Button className="w-full" onClick={() => save("pending")} disabled={loading || profileLoading}>
              {loading ? "Creating…" : "Create invoice"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => { if (validate()) setPreview(true); }}>
              <Eye /> Preview
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => save("draft")} disabled={loading}>
              <Save /> Save draft
            </Button>
            {onCancel && (
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </aside>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice preview</DialogTitle>
            <DialogDescription>Review how your invoice will appear.</DialogDescription>
          </DialogHeader>
          <InvoicePreview invoice={previewInvoice} actions={false} />
        </DialogContent>
      </Dialog>
    </>
  );
}
