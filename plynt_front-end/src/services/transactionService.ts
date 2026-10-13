// src/services/transactionService.ts
import { supabase, type TransactionRow } from "@/lib/supabase";

export type { TransactionRow };

export type TxType = "incoming" | "outgoing" | "gift" | "invoice" | "swap" | "convert";

export interface RecordTxInput {
  profileId: string;
  txHash?: string;
  type: TxType;
  counterparty: string;
  fromAddress?: string;
  toAddress?: string;
  asset: string;
  amount: number;
  usdValue: number;
  platformFee?: number;
  status?: "pending" | "confirmed" | "failed";
  memo?: string;
  explorerUrl?: string;
}

/** Platform fee rate: 0.6% on outgoing / gift transactions */
export const PLATFORM_FEE_RATE = 0.006;

export function calcPlatformFee(amount: number): number {
  return parseFloat((amount * PLATFORM_FEE_RATE).toFixed(10));
}

/** Persist a transaction record to Supabase */
export async function recordTransaction(input: RecordTxInput): Promise<TransactionRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      profile_id: input.profileId,
      tx_hash: input.txHash ?? null,
      type: input.type,
      counterparty: input.counterparty,
      from_address: input.fromAddress ?? null,
      to_address: input.toAddress ?? null,
      asset: input.asset,
      amount: input.amount,
      usd_value: input.usdValue,
      platform_fee: input.platformFee ?? 0,
      status: input.status ?? "confirmed",
      memo: input.memo ?? null,
      explorer_url: input.explorerUrl ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[transactionService] recordTransaction:", error.message);
    return null;
  }
  return data as TransactionRow;
}

/** Fetch all persisted transactions for a profile, newest first */
export async function fetchTransactions(profileId: string): Promise<TransactionRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[transactionService] fetchTransactions:", error.message);
    return [];
  }
  return (data ?? []) as TransactionRow[];
}

/** Check if a tx_hash is already recorded (to avoid duplicates from on-chain sync) */
export async function txHashExists(profileId: string, txHash: string): Promise<boolean> {
  if (!supabase) return false;

  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("tx_hash", txHash);

  if (error) return false;
  return (count ?? 0) > 0;
}
