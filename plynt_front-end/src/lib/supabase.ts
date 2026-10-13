import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─── Generated types from `supabase gen types typescript` ────────────────────
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; privy_did: string; wallet_address: string | null; display_name: string | null; email: string | null; role: "user" | "admin"; created_at: string; updated_at: string };
        Insert: { id?: string; privy_did: string; wallet_address?: string | null; display_name?: string | null; email?: string | null; role?: "user" | "admin"; created_at?: string; updated_at?: string };
        Update: { id?: string; privy_did?: string; wallet_address?: string | null; display_name?: string | null; email?: string | null; role?: "user" | "admin"; created_at?: string; updated_at?: string };
      };
      invoices: {
        Row: { id: string; profile_id: string; number: string; client_name: string; client_email: string; title: string; description: string; amount: number; asset: "MON" | "USDC" | "WETH"; status: "draft" | "pending" | "paid" | "overdue"; due_date: string; notes: string | null; payment_link: string; items: Json; created_at: string; updated_at: string };
        Insert: { id?: string; profile_id: string; number: string; client_name: string; client_email: string; title: string; description?: string; amount?: number; asset?: "MON" | "USDC" | "WETH"; status?: "draft" | "pending" | "paid" | "overdue"; due_date: string; notes?: string | null; payment_link?: string; items?: Json; created_at?: string; updated_at?: string };
        Update: { id?: string; profile_id?: string; number?: string; client_name?: string; client_email?: string; title?: string; description?: string; amount?: number; asset?: "MON" | "USDC" | "WETH"; status?: "draft" | "pending" | "paid" | "overdue"; due_date?: string; notes?: string | null; payment_link?: string; items?: Json; created_at?: string; updated_at?: string };
      };
      gifts: {
        Row: { id: string; profile_id: string; direction: string; recipient: string; recipient_address: string | null; sender: string; sender_address: string | null; amount: number; asset: "MON" | "USDC" | "WETH"; message: string | null; unlock_date: string; expiration_date: string | null; is_recurring: boolean; recurrence_count: number | null; recurrence_frequency: string | null; executed_count: number; status: "scheduled" | "available" | "claimed" | "expired" | "cancelled"; claimed_at: string | null; tx_hash: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; profile_id: string; direction: string; recipient: string; recipient_address?: string | null; sender: string; sender_address?: string | null; amount: number; asset?: "MON" | "USDC" | "WETH"; message?: string | null; unlock_date: string; expiration_date?: string | null; is_recurring?: boolean; recurrence_count?: number | null; recurrence_frequency?: string | null; executed_count?: number; status?: "scheduled" | "available" | "claimed" | "expired" | "cancelled"; claimed_at?: string | null; tx_hash?: string | null };
        Update: Partial<Database["public"]["Tables"]["gifts"]["Insert"]>;
      };
      salary_config: {
        Row: { id: string; profile_id: string; employer: string; amount: number; asset: "MON" | "USDC" | "WETH"; frequency: "weekly" | "biweekly" | "monthly" | "quarterly"; next_payment: string | null; last_payment: string | null; auto_distribute: boolean; distribution_rules: Json; created_at: string; updated_at: string };
        Insert: { id?: string; profile_id: string; employer?: string; amount?: number; asset?: "MON" | "USDC" | "WETH"; frequency?: "weekly" | "biweekly" | "monthly" | "quarterly"; next_payment?: string | null; last_payment?: string | null; auto_distribute?: boolean; distribution_rules?: Json };
        Update: Partial<Database["public"]["Tables"]["salary_config"]["Insert"]>;
      };
      salary_records: {
        Row: { id: string; profile_id: string; employer: string; amount: number; asset: "MON" | "USDC" | "WETH"; payment_date: string; period: string; status: string; tx_hash: string | null; created_at: string };
        Insert: { id?: string; profile_id: string; employer: string; amount: number; asset?: "MON" | "USDC" | "WETH"; payment_date: string; period: string; status?: string; tx_hash?: string | null };
        Update: Partial<Database["public"]["Tables"]["salary_records"]["Insert"]>;
      };
      notifications: {
        Row: { id: string; profile_id: string; title: string; body: string; type: "info" | "success" | "warning" | "error"; read: boolean; created_at: string };
        Insert: { id?: string; profile_id: string; title: string; body?: string; type?: "info" | "success" | "warning" | "error"; read?: boolean; created_at?: string };
        Update: { id?: string; profile_id?: string; title?: string; body?: string; type?: "info" | "success" | "warning" | "error"; read?: boolean; created_at?: string };
      };
      transactions: {
        Row: { id: string; profile_id: string; tx_hash: string | null; type: "incoming" | "outgoing" | "gift" | "invoice" | "swap" | "convert"; counterparty: string; from_address: string | null; to_address: string | null; asset: string; amount: number; usd_value: number; platform_fee: number; status: "pending" | "confirmed" | "failed"; memo: string | null; explorer_url: string | null; created_at: string };
        Insert: { id?: string; profile_id: string; tx_hash?: string | null; type: "incoming" | "outgoing" | "gift" | "invoice" | "swap" | "convert"; counterparty?: string; from_address?: string | null; to_address?: string | null; asset?: string; amount?: number; usd_value?: number; platform_fee?: number; status?: "pending" | "confirmed" | "failed"; memo?: string | null; explorer_url?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
      };
    };
    Enums: {
      user_role: "user" | "admin";
      invoice_status: "draft" | "pending" | "paid" | "overdue";
      asset_symbol: "MON" | "USDC" | "WETH";
      gift_status: "scheduled" | "available" | "claimed" | "expired" | "cancelled";
      salary_frequency: "weekly" | "biweekly" | "monthly" | "quarterly";
    };
  };
};

// Convenience row types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
export type GiftRow = Database["public"]["Tables"]["gifts"]["Row"];
export type SalaryConfigRow = Database["public"]["Tables"]["salary_config"]["Row"];
export type SalaryRecordRow = Database["public"]["Tables"]["salary_records"]["Row"];
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
export type UserRole = Database["public"]["Enums"]["user_role"];

// ─── Client ───────────────────────────────────────────────────────────────────

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

export const supabase: SupabaseClient<Database> | null =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey)
    : null;

if (!supabase) {
  console.warn(
    "[plynt] Supabase client not initialised — VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing from .env.",
  );
}
