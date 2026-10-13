import { supabase } from "@/lib/supabase";
import type { Gift } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToGift(row: Record<string, any>): Gift {
  return {
    id: row["id"],
    direction: row["direction"] as "sent" | "received",
    recipient: row["recipient"],
    recipientAddress: row["recipient_address"] ?? undefined,
    sender: row["sender"],
    senderAddress: row["sender_address"] ?? undefined,
    amount: Number(row["amount"]),
    asset: row["asset"],
    message: row["message"] ?? undefined,
    unlockDate: row["unlock_date"],
    expirationDate: row["expiration_date"] ?? undefined,
    isRecurring: row["is_recurring"],
    recurrenceCount: row["recurrence_count"] ?? undefined,
    recurrenceFrequency: row["recurrence_frequency"] ?? undefined,
    executedCount: row["executed_count"],
    status: row["status"],
    claimedAt: row["claimed_at"] ?? undefined,
    txHash: row["tx_hash"] ?? undefined,
    createdAt: row["created_at"],
  };
}

function giftToRow(g: Gift, profileId: string) {
  return {
    id: g.id,
    profile_id: profileId,
    direction: g.direction,
    recipient: g.recipient,
    recipient_address: g.recipientAddress ?? null,
    sender: g.sender,
    sender_address: g.senderAddress ?? null,
    amount: g.amount,
    asset: g.asset,
    message: g.message ?? null,
    unlock_date: g.unlockDate,
    expiration_date: g.expirationDate ?? null,
    is_recurring: g.isRecurring,
    recurrence_count: g.recurrenceCount ?? null,
    recurrence_frequency: g.recurrenceFrequency ?? null,
    executed_count: g.executedCount,
    status: g.status,
    claimed_at: g.claimedAt ?? null,
    tx_hash: g.txHash ?? null,
  };
}

// In-memory fallback
let memGifts: Gift[] = [];
const wait = (ms = 200) => new Promise((r) => setTimeout(r, ms));

// ─── Service ──────────────────────────────────────────────────────────────────

export const giftService = {
  async getGifts(profileId?: string): Promise<Gift[]> {
    if (!supabase || !profileId) {
      await wait();
      return [...memGifts];
    }
    const { data, error } = await (supabase as any)
      .from("gifts")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, any>[]).map(rowToGift);
  },

  async createGift(g: Gift, profileId?: string): Promise<Gift> {
    if (!supabase || !profileId) {
      await wait();
      memGifts = [g, ...memGifts];
      return g;
    }
    const { data, error } = await (supabase as any)
      .from("gifts")
      .insert(giftToRow(g, profileId))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToGift(data as Record<string, any>);
  },

  async updateGift(id: string, patch: Partial<Gift>, profileId?: string): Promise<void> {
    if (!supabase || !profileId) {
      await wait();
      memGifts = memGifts.map((g) => (g.id === id ? { ...g, ...patch } : g));
      return;
    }
    const updates: Record<string, unknown> = {};
    if (patch.status !== undefined) updates["status"] = patch.status;
    if (patch.claimedAt !== undefined) updates["claimed_at"] = patch.claimedAt;
    if (patch.executedCount !== undefined) updates["executed_count"] = patch.executedCount;
    if (patch.txHash !== undefined) updates["tx_hash"] = patch.txHash;
    const { error } = await (supabase as any)
      .from("gifts")
      .update(updates)
      .eq("id", id)
      .eq("profile_id", profileId);
    if (error) throw new Error(error.message);
  },

  async deleteGift(id: string, profileId?: string): Promise<void> {
    if (!supabase || !profileId) {
      await wait();
      memGifts = memGifts.filter((g) => g.id !== id);
      return;
    }
    const { error } = await (supabase as any)
      .from("gifts")
      .delete()
      .eq("id", id)
      .eq("profile_id", profileId);
    if (error) throw new Error(error.message);
  },
};
