import { createFileRoute } from "@tanstack/react-router";
import { Activity, CalendarDays, Copy, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageIntro, shorten } from "@/components/shared/common";
import { mockTransactions } from "@/data/mockTransactions";
import { TransactionList } from "@/components/transactions/transaction-list";
import { usePrivyUser } from "@/hooks/use-privy-user";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — PLYNT" },
      { name: "description", content: "View your PLYNT identity and financial activity." },
      { property: "og:title", content: "Profile — PLYNT" },
      { property: "og:description", content: "View your PLYNT identity and financial activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { ready, displayName, initials, email, walletAddress, joinedAt } =
    usePrivyUser();

  if (!ready) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard?.writeText(walletAddress);
      toast.success("Wallet address copied");
    }
  };

  return (
    <div className="space-y-7">
      <PageIntro title="Profile" description="Your identity and activity across PLYNT." />

      {/* ── Identity card ── */}
      <section className="panel flex flex-col gap-6 sm:flex-row sm:items-center">
        <Avatar className="size-24 rounded-xl">
          <AvatarFallback className="text-xl rounded-xl">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h2 className="text-2xl font-semibold">{displayName}</h2>
          {email && (
            <p className="text-sm text-muted-foreground">{email}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {walletAddress && (
              <span className="flex items-center gap-2">
                <Wallet className="size-4 text-primary" />
                {shorten(walletAddress)}
              </span>
            )}
            {joinedAt && (
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" />
                Joined {joinedAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
            )}
          </div>
        </div>

        {walletAddress && (
          <Button variant="outline" onClick={handleCopyAddress}>
            <Copy />
            Copy address
          </Button>
        )}
      </section>

      {/* ── Activity stats ── */}
      <section className="panel">
        <Activity className="text-primary" />
        <h2 className="mt-4 section-title">Account activity</h2>
        <div className="detail-list mt-5">
          <div>
            <span>Invoices created</span>
            <strong>0</strong>
          </div>
          <div>
            <span>Transactions reviewed</span>
            <strong>{mockTransactions.length}</strong>
          </div>
        </div>
      </section>

      {/* ── Recent activity ── */}
      <section>
        <h2 className="mb-4 section-title">Recent activity</h2>
        <TransactionList transactions={mockTransactions} limit={3} />
      </section>
    </div>
  );
}
