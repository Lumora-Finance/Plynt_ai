import { supabase } from "@/lib/supabase";
import type { SalaryConfig, SalaryRecord, SalarySplitRule } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToConfig(row: Record<string, any>): SalaryConfig {
  return {
    id: row["id"],
    employer: row["employer"],
    amount: Number(row["amount"]),
    asset: row["asset"],
    frequency: row["frequency"],
    nextPayment: row["next_payment"] ?? new Date().toISOString().slice(0, 10),
    lastPayment: row["last_payment"] ?? undefined,
    distributionRules: (row["distribution_rules"] as SalarySplitRule[]) ?? [],
    autoDistribute: row["auto_distribute"],
  };
}

function rowToRecord(row: Record<string, any>): SalaryRecord {
  return {
    id: row["id"],
    employer: row["employer"],
    amount: Number(row["amount"]),
    asset: row["asset"],
    paymentDate: row["payment_date"],
    period: row["period"],
    status: row["status"] as "received" | "pending" | "upcoming",
    txHash: row["tx_hash"] ?? undefined,
  };
}

// In-memory fallback
let memConfig: SalaryConfig | null = null;
let memHistory: SalaryRecord[] = [];
const wait = (ms = 200) => new Promise((r) => setTimeout(r, ms));

// ─── Service ──────────────────────────────────────────────────────────────────

export const salaryService = {
  async getConfig(profileId?: string): Promise<SalaryConfig | null> {
    if (!supabase || !profileId) {
      await wait();
      return memConfig;
    }
    const { data, error } = await (supabase as any)
      .from("salary_config")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return rowToConfig(data as Record<string, any>);
  },

  async setConfig(config: SalaryConfig, profileId?: string): Promise<SalaryConfig> {
    if (!supabase || !profileId) {
      await wait();
      memConfig = config;
      return config;
    }
    const row = {
      id: config.id,
      profile_id: profileId,
      employer: config.employer,
      amount: config.amount,
      asset: config.asset,
      frequency: config.frequency,
      next_payment: config.nextPayment ?? null,
      last_payment: config.lastPayment ?? null,
      auto_distribute: config.autoDistribute,
      distribution_rules: config.distributionRules,
    };
    const { data, error } = await (supabase as any)
      .from("salary_config")
      .upsert(row, { onConflict: "profile_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToConfig(data as Record<string, any>);
  },

  async updateRules(rules: SalarySplitRule[], profileId?: string): Promise<void> {
    if (!supabase || !profileId) {
      await wait();
      if (memConfig) memConfig = { ...memConfig, distributionRules: rules };
      return;
    }
    const { error } = await (supabase as any)
      .from("salary_config")
      .update({ distribution_rules: rules })
      .eq("profile_id", profileId);
    if (error) throw new Error(error.message);
  },

  async updateAutoDistribute(auto: boolean, profileId?: string): Promise<void> {
    if (!supabase || !profileId) {
      await wait();
      if (memConfig) memConfig = { ...memConfig, autoDistribute: auto };
      return;
    }
    const { error } = await (supabase as any)
      .from("salary_config")
      .update({ auto_distribute: auto })
      .eq("profile_id", profileId);
    if (error) throw new Error(error.message);
  },

  async getHistory(profileId?: string): Promise<SalaryRecord[]> {
    if (!supabase || !profileId) {
      await wait();
      return [...memHistory];
    }
    const { data, error } = await (supabase as any)
      .from("salary_records")
      .select("*")
      .eq("profile_id", profileId)
      .order("payment_date", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, any>[]).map(rowToRecord);
  },

  async addRecord(record: SalaryRecord, profileId?: string): Promise<SalaryRecord> {
    if (!supabase || !profileId) {
      await wait();
      memHistory = [record, ...memHistory];
      return record;
    }
    const { data, error } = await (supabase as any)
      .from("salary_records")
      .insert({
        id: record.id,
        profile_id: profileId,
        employer: record.employer,
        amount: record.amount,
        asset: record.asset,
        payment_date: record.paymentDate,
        period: record.period,
        status: record.status,
        tx_hash: record.txHash ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToRecord(data as Record<string, any>);
  },
};
