// transactionService is kept for backwards compatibility.
// Real transaction data comes from useTransactions hook (Monad RPC block scanning).
export const transactionService = {
  async getTransactions() { return []; },
  async getTransaction(_id: string) { return undefined; },
};
