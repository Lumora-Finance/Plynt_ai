import type { AutomationRule, AutomationExecution } from "@/types";

let automations: AutomationRule[] = [];
let executions: AutomationExecution[] = [];
const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export const automationService = {
  async getAutomations(): Promise<AutomationRule[]> { await wait(); return [...automations]; },
  async createAutomation(rule: AutomationRule): Promise<AutomationRule> {
    await wait(); automations = [rule, ...automations]; return rule;
  },
  async updateAutomation(id: string, data: Partial<AutomationRule>): Promise<void> {
    await wait();
    automations = automations.map((a) => (a.id === id ? { ...a, ...data } : a));
  },
  async getExecutions(): Promise<AutomationExecution[]> { await wait(); return [...executions]; },
};
