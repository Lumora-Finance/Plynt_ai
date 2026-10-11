import type { RecurringPayment } from "@/types";

let payments: RecurringPayment[] = [];
const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export const recurringPaymentService = {
  async getPayments(): Promise<RecurringPayment[]> { await wait(); return [...payments]; },
  async createPayment(p: RecurringPayment): Promise<RecurringPayment> {
    await wait(); payments = [p, ...payments]; return p;
  },
  async updatePayment(id: string, data: Partial<RecurringPayment>): Promise<void> {
    await wait();
    payments = payments.map((p) => (p.id === id ? { ...p, ...data } : p));
  },
};
