import type { Gift } from "@/types";

let gifts: Gift[] = [];
const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export const giftService = {
  async getGifts(): Promise<Gift[]> { await wait(); return [...gifts]; },
  async createGift(g: Gift): Promise<Gift> { await wait(); gifts = [g, ...gifts]; return g; },
  async updateGift(id: string, data: Partial<Gift>): Promise<void> {
    await wait();
    gifts = gifts.map((g) => (g.id === id ? { ...g, ...data } : g));
  },
};
