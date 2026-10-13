import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2, ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InvoicePreview } from "@/components/invoices/invoice-preview";
import { PageIntro, EmptyState } from "@/components/shared/common";
import { invoiceService } from "@/services/invoiceService";
import { useProfile } from "@/hooks/use-profile";
import type { Invoice } from "@/types";

export const Route = createFileRoute("/invoices/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Invoice ${params.id} — PLYNT` },
      { name: "description", content: "Review a PLYNT payment invoice and payment status." },
      { property: "og:title", content: `Invoice — PLYNT` },
      { property: "og:description", content: "Review a PLYNT payment invoice and payment status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const { profile } = useProfile();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await invoiceService.getInvoice(id, profile?.id);
        if (!cancelled) setInvoice(data ?? null);
      } catch (e) {
        if (!cancelled) toast.error("Failed to load invoice");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, profile?.id]);

  const handleMarkPaid = async () => {
    if (!invoice) return;
    setMarkingPaid(true);
    try {
      const updated = await invoiceService.updateInvoice(invoice.id, { status: "paid" }, profile?.id);
      if (updated) setInvoice(updated);
      toast.success("Invoice marked as paid");
    } catch (e) {
      toast.error("Failed to update invoice");
    } finally {
      setMarkingPaid(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="Invoice not found"
        description="This invoice may have been removed or the link is incorrect."
        action={
          <Button asChild>
            <Link to="/invoices">Back to invoices</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-7">
      <PageIntro
        title={invoice.number}
        description={`${invoice.clientName} · ${invoice.title}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/invoices">
                <ArrowLeft />
                Back
              </Link>
            </Button>
            {invoice.status !== "paid" && (
              <Button onClick={handleMarkPaid} disabled={markingPaid}>
                {markingPaid ? <Loader2 className="animate-spin" /> : <Check />}
                Mark as paid
              </Button>
            )}
          </div>
        }
      />
      <InvoicePreview invoice={invoice} />
    </div>
  );
}
