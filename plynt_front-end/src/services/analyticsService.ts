import type { Analytics } from "@/types";

// Analytics are now derived from real on-chain data in useWalletData + useTransactions hooks.
export const analyticsService = {
  async getAnalytics(_period = "30D"): Promise<Analytics> {
    return {
      points: [], totalVolume: 0, income: 0, expenses: 0, netFlow: 0, averageTransaction: 0,
      invoicePerformance: [], assetDistribution: [],
    };
  },
};
