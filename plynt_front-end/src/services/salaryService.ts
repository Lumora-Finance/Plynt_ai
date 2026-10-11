import type { SalaryConfig, SalaryRecord, SalarySplitRule } from "@/types";

let salaryConfig: SalaryConfig | null = null;
let salaryHistory: SalaryRecord[] = [];
const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export const salaryService = {
  async getConfig(): Promise<SalaryConfig | null> { await wait(); return salaryConfig; },
  async setConfig(config: SalaryConfig): Promise<void> { await wait(); salaryConfig = config; },
  async updateRules(rules: SalarySplitRule[]): Promise<void> {
    await wait();
    if (salaryConfig) salaryConfig = { ...salaryConfig, distributionRules: rules };
  },
  async getHistory(): Promise<SalaryRecord[]> { await wait(); return [...salaryHistory]; },
};
