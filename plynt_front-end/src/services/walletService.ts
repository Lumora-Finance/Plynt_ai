// walletService is kept for backwards compatibility but is no longer the source of truth.
// Real wallet data comes from useWalletData hook (Monad RPC) and Privy embedded wallet.
const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export const walletService = {
  async getWallet() {
    await wait();
    return null;
  },
  async createTransactionDraft(draft: unknown) {
    await wait(300);
    return draft;
  },
  async sendTransaction(params: unknown) {
    await wait(600);
    return { success: true, message: "Use Privy useSendTransaction hook for real sends.", params };
  },
};
