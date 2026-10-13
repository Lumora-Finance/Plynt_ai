// src/services/invoiceService.ts
import { supabase } from "@/lib/supabase";
import type { Invoice, InvoiceItem } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToInvoice(row: any): Invoice {
  return {
    id: row.id,
    number: row.number,
    clientName: row.client_name,
    clientEmail: row.client_email,
    title: row.title,
    description: row.description ?? "",
    amount: Number(row.amount),
    asset: row.asset,
    status: row.status,
    dueDate: row.due_date,
    notes: row.notes ?? undefined,
    paymentLink: row.payment_link ?? "",
    items: (row.items as InvoiceItem[]) ?? [],
    createdAt: row.created_at,
  };
}

function invoiceToRow(inv: Invoice, profileId: string) {
  return {
    id: inv.id,
    profile_id: profileId,
    number: inv.number,
    client_name: inv.clientName,
    client_email: inv.clientEmail,
    title: inv.title,
    description: inv.description ?? "",
    amount: inv.amount,
    asset: inv.asset,
    status: inv.status,
    due_date: inv.dueDate,
    notes: inv.notes ?? null,
    payment_link: inv.paymentLink ?? "",
    items: inv.items as any,
  };
}

// In-memory fallback when Supabase is not configured
let memInvoices: Invoice[] = [];
const wait = (ms = 200) => new Promise((r) => setTimeout(r, ms));

// ─── Service ──────────────────────────────────────────────────────────────────

export const invoiceService = {
  async getInvoices(profileId?: string): Promise<Invoice[]> {
    if (!supabase || !profileId) {
      await wait();
      return [...memInvoices];
    }
    const { data, error } = await (supabase as any)
      .from("invoices")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToInvoice);
  },

  async getInvoice(id: string, profileId?: string): Promise<Invoice | undefined> {
    if (!supabase || !profileId) {
      await wait();
      return memInvoices.find((i) => i.id === id);
    }
    const { data, error } = await (supabase as any)
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("profile_id", profileId)
      .single();
    if (error) return undefined;
    return rowToInvoice(data);
  },

  async createInvoice(inv: Invoice, profileId?: string): Promise<Invoice> {
    if (!supabase || !profileId) {
      await wait();
      memInvoices = [inv, ...memInvoices];
      return inv;
    }
    const { data, error } = await (supabase as any)
      .from("invoices")
      .insert(invoiceToRow(inv, profileId))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToInvoice(data);
  },

  async updateInvoice(id: string, patch: Partial<Invoice>, profileId?: string): Promise<Invoice | undefined> {
    if (!supabase || !profileId) {
      await wait();
      const idx = memInvoices.findIndex((i) => i.id === id);
      if (idx === -1) return undefined;
      memInvoices[idx] = { ...memInvoices[idx]!, ...patch };
      return memInvoices[idx];
    }
    const updates: Record<string, unknown> = {};
    if (patch.clientName !== undefined) updates["client_name"] = patch.clientName;
    if (patch.clientEmail !== undefined) updates["client_email"] = patch.clientEmail;
    if (patch.title !== undefined) updates["title"] = patch.title;
    if (patch.description !== undefined) updates["description"] = patch.description;
    if (patch.amount !== undefined) updates["amount"] = patch.amount;
    if (patch.asset !== undefined) updates["asset"] = patch.asset;
    if (patch.status !== undefined) updates["status"] = patch.status;
    if (patch.dueDate !== undefined) updates["due_date"] = patch.dueDate;
    if (patch.notes !== undefined) updates["notes"] = patch.notes;
    if (patch.items !== undefined) updates["items"] = patch.items;
    const { data, error } = await (supabase as any)
      .from("invoices")
      .update(updates)
      .eq("id", id)
      .eq("profile_id", profileId)
      .select()
      .single();
    if (error) return undefined;
    return rowToInvoice(data);
  },

  async deleteInvoice(id: string, profileId?: string): Promise<void> {
    if (!supabase || !profileId) {
      await wait();
      memInvoices = memInvoices.filter((i) => i.id !== id);
      return;
    }
    const { error } = await (supabase as any)
      .from("invoices")
      .delete()
      .eq("id", id)
      .eq("profile_id", profileId);
    if (error) throw new Error(error.message);
  },
};
