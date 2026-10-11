import type { Invoice } from "@/types";

// Invoices are user-created — no hardcoded data. In a future version these
// will be persisted to Supabase. For now they live in component state.
let invoices: Invoice[] = [];

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export const invoiceService = {
  async getInvoices(): Promise<Invoice[]> { await wait(); return [...invoices]; },
  async getInvoice(id: string): Promise<Invoice | undefined> { await wait(); return invoices.find((i) => i.id === id); },
  async createInvoice(inv: Invoice): Promise<Invoice> { await wait(); invoices = [inv, ...invoices]; return inv; },
  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | undefined> {
    await wait();
    const idx = invoices.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    invoices[idx] = { ...invoices[idx]!, ...data };
    return invoices[idx];
  },
  async deleteInvoice(id: string): Promise<void> { await wait(); invoices = invoices.filter((i) => i.id !== id); },
};
