import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleOff,
  Clock,
  Gift,
  Inbox,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageIntro, EmptyState, currency } from "@/components/shared/common";
import { MonLogo } from "@/components/shared/mon-logo";
import { Reveal } from "@/components/shared/motion";
import { giftService } from "@/services/giftService";
import { recordTransaction, calcPlatformFee, PLATFORM_FEE_RATE } from "@/services/transactionService";
import { createNotification } from "@/services/notificationService";
import { useProfile } from "@/hooks/use-profile";
import type { Gift as GiftType } from "@/types";

export const Route = createFileRoute("/gifts")({
  head: () => ({
    meta: [
      { title: "Gifts — PLYNT" },
      { name: "description", content: "Send and manage programmable USDC gifts on Monad." },
    ],
  }),
  component: GiftsPage,
});

// ─── Status badge ─────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; classes: string }> = {
  scheduled: { label: "Scheduled", classes: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800" },
  available: { label: "Available 🎁", classes: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800" },
  claimed: { label: "Claimed", classes: "bg-secondary text-primary border-border" },
  expired: { label: "Expired", classes: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelled", classes: "bg-destructive/10 text-destructive border-destructive/20" },
};

function GiftStatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig["scheduled"]!;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.classes}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}

// ─── Compute what status a gift should have right now ─────────────────────────
function resolveGiftStatus(gift: GiftType): GiftType["status"] {
  if (gift.status === "claimed" || gift.status === "cancelled") return gift.status;
  const now = Date.now();
  const unlock = new Date(gift.unlockDate).getTime();
  const expiry = gift.expirationDate ? new Date(gift.expirationDate).getTime() : null;
  if (expiry && now > expiry) return "expired";
  if (now >= unlock) return "available";
  return "scheduled";
}

// ─── Gift card ────────────────────────────────────────────────────────────────
function GiftCard({
  gift,
  onCancel,
  onClaim,
}: {
  gift: GiftType;
  onCancel: (id: string) => void;
  onClaim: (id: string) => void;
}) {
  const liveStatus = resolveGiftStatus(gift);
  const canCancel = ["scheduled", "available"].includes(liveStatus) && gift.direction === "sent";
  const canClaim = liveStatus === "available" && gift.direction === "received";

  const unlockDate = new Date(gift.unlockDate);
  const isUnlocked = Date.now() >= unlockDate.getTime();
  const timeUntilUnlock = unlockDate.getTime() - Date.now();
  const daysUntil = Math.ceil(timeUntilUnlock / 86400000);

  return (
    <div className="panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="action-icon mt-0.5 shrink-0">
            <Gift />
          </span>
          <div>
            <p className="font-semibold">
              {gift.direction === "sent" ? `To ${gift.recipient}` : `From ${gift.sender}`}
            </p>
            {gift.message && (
              <p className="mt-1 max-w-md text-sm italic text-muted-foreground">"{gift.message}"</p>
            )}
            {!isUnlocked && liveStatus === "scheduled" && (
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                🔒 Unlocks in {daysUntil} day{daysUntil !== 1 ? "s" : ""} · {unlockDate.toLocaleDateString()}
              </p>
            )}
            {isUnlocked && liveStatus === "available" && (
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                🟢 Unlocked · Ready to claim
              </p>
            )}
          </div>
        </div>
        <GiftStatusBadge status={liveStatus} />
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Amount</p>
          <p className="mt-1 flex items-center gap-1.5 font-mono font-semibold text-primary">
            <MonLogo size="xs" showText={false} />
            {currency(gift.amount)} MON
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Unlock date</p>
          <p className="mt-1 font-medium">{new Date(gift.unlockDate).toLocaleDateString()}</p>
        </div>
        {gift.expirationDate && (
          <div>
            <p className="text-xs text-muted-foreground">Expires</p>
            <p className="mt-1 font-medium">{new Date(gift.expirationDate).toLocaleDateString()}</p>
          </div>
        )}
        {gift.isRecurring && (
          <div>
            <p className="text-xs text-muted-foreground">Recurrence</p>
            <p className="mt-1 font-medium capitalize">
              {gift.recurrenceFrequency} · {gift.executedCount}/{gift.recurrenceCount}
            </p>
          </div>
        )}
        {gift.claimedAt && (
          <div>
            <p className="text-xs text-muted-foreground">Claimed</p>
            <p className="mt-1 font-medium">{new Date(gift.claimedAt).toLocaleDateString()}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">Created</p>
          <p className="mt-1 font-medium">{new Date(gift.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {(canCancel || canClaim) && (
        <div className="mt-4 flex gap-2 border-t border-border pt-4">
          {canClaim && (
            <Button size="sm" onClick={() => onClaim(gift.id)}>
              <CheckCircle2 className="size-4" />
              Claim gift
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onCancel(gift.id)}
            >
              <CircleOff className="size-4" />
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Create Gift form ─────────────────────────────────────────────────────────
type CreateGiftForm = {
  recipient: string;
  recipientAddress: string;
  amount: string;
  asset: "MON";
  message: string;
  unlockDate: string;
  expirationDate: string;
  isRecurring: boolean;
  recurrenceCount: string;
  recurrenceFrequency: "weekly" | "monthly" | "biweekly";
};

const defaultForm: CreateGiftForm = {
  recipient: "",
  recipientAddress: "",
  amount: "",
  asset: "MON",
  message: "",
  unlockDate: new Date().toISOString().split("T")[0]!,
  expirationDate: "",
  isRecurring: false,
  recurrenceCount: "",
  recurrenceFrequency: "weekly",
};

function CreateGiftDialog({
  open,
  onOpenChange,
  onCreated,
  profileId,
  displayName,
  walletAddress,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (g: GiftType) => void;
  profileId?: string | undefined;
  displayName?: string | undefined;
  walletAddress?: string | undefined;
}) {
  const [form, setForm] = useState<CreateGiftForm>(defaultForm);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof CreateGiftForm>(k: K, v: CreateGiftForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setForm(defaultForm);
    setStep("form");
  };

  const handleConfirm = async () => {
    if (!profileId) {
      toast.error("Sign in required", { description: "You need to be signed in to create gifts." });
      return;
    }
    setLoading(true);

    // Determine initial status based on unlock date
    const unlockTs = new Date(form.unlockDate).getTime();
    const initialStatus: GiftType["status"] = Date.now() >= unlockTs ? "available" : "scheduled";

    const newGift = {
      id: crypto.randomUUID(),
      direction: "sent" as const,
      recipient: form.recipient,
      ...(form.recipientAddress ? { recipientAddress: form.recipientAddress } : {}),
      sender: displayName ?? "You",
      ...(walletAddress ? { senderAddress: walletAddress } : {}),
      amount: Number(form.amount),
      asset: form.asset,
      ...(form.message ? { message: form.message } : {}),
      unlockDate: form.unlockDate,
      ...(form.expirationDate ? { expirationDate: form.expirationDate } : {}),
      isRecurring: form.isRecurring,
      ...(form.isRecurring && form.recurrenceCount
        ? { recurrenceCount: Number(form.recurrenceCount) }
        : {}),
      ...(form.isRecurring ? { recurrenceFrequency: form.recurrenceFrequency } : {}),
      executedCount: 0,
      status: initialStatus,
      createdAt: new Date().toISOString(),
    } satisfies GiftType;

    try {
      const created = await giftService.createGift(newGift, profileId);
      onCreated(created);
      onOpenChange(false);
      reset();
      toast.success("Gift sent! 🎁", {
        description: `${currency(created.amount)} ${created.asset} for ${created.recipient} — ${
          initialStatus === "available" ? "available to claim now" : `unlocks ${new Date(form.unlockDate).toLocaleDateString()}`
        }`,
      });

      // ── Record transaction + notification ────────────────────────────────
      if (profileId) {
        const PRICES: Record<string, number> = { MON: 0.189, USDC: 1.0, WETH: 1950 };
        const usdValue = created.amount * (PRICES[created.asset] ?? 0);
        const platformFee = calcPlatformFee(created.amount);
        await recordTransaction({
          profileId,
          type: "gift",
          counterparty: created.recipient,
          toAddress: created.recipientAddress ?? undefined,
          asset: created.asset,
          amount: created.amount,
          usdValue,
          platformFee,
          status: "confirmed",
          memo: created.message ?? `Gift to ${created.recipient}`,
        });
        await createNotification(
          profileId,
          `Gift sent to ${created.recipient}`,
          `${currency(created.amount)} ${created.asset} gift. Platform fee: ${platformFee.toFixed(6)} ${created.asset} (${(PLATFORM_FEE_RATE * 100).toFixed(1)}%).`,
          "success",
        );
      }
    } catch (e) {
      toast.error("Failed to create gift", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? "Send a programmable gift" : "Confirm gift"}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "Set the amount, recipient, and unlock conditions."
              : "Review your gift details before sending."}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Recipient name *</Label>
              <Input
                placeholder="e.g. Mom, Alex, Team"
                value={form.recipient}
                onChange={(e) => set("recipient", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Recipient wallet address (optional)</Label>
              <Input
                placeholder="Monad wallet address (0x…)"
                value={form.recipientAddress}
                onChange={(e) => set("recipientAddress", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 100"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Asset</Label>
                <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-muted/40 px-3">
                  <MonLogo size="sm" />
                  <span className="text-sm font-medium">MON</span>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Message (optional)</Label>
              <Textarea
                placeholder="Add a personal note…"
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Unlock date *</Label>
                <Input
                  type="date"
                  value={form.unlockDate}
                  onChange={(e) => set("unlockDate", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {new Date(form.unlockDate).getTime() <= Date.now()
                    ? "⚡ Available immediately"
                    : `🔒 Locks until ${new Date(form.unlockDate).toLocaleDateString()}`}
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Expiration (optional)</Label>
                <Input
                  type="date"
                  value={form.expirationDate}
                  onChange={(e) => set("expirationDate", e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isRecurring}
                onCheckedChange={(v) => set("isRecurring", v)}
                id="recurring-gift"
              />
              <Label htmlFor="recurring-gift">Recurring gift</Label>
            </div>
            {form.isRecurring && (
              <div className="grid grid-cols-2 gap-3 border-l-2 border-primary/30 pl-4">
                <div className="grid gap-2">
                  <Label>Frequency</Label>
                  <Select
                    value={form.recurrenceFrequency}
                    onValueChange={(v) =>
                      set("recurrenceFrequency", v as CreateGiftForm["recurrenceFrequency"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Biweekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Number of times</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 12"
                    value={form.recurrenceCount}
                    onChange={(e) => set("recurrenceCount", e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Gift summary</p>
            </div>
            <div className="detail-list">
              {[
                ["To", form.recipient],
                ["Amount", `${currency(Number(form.amount))} ${form.asset}`],
                ["Unlock date", new Date(form.unlockDate).toLocaleDateString()],
                [
                  "Status when sent",
                  new Date(form.unlockDate).getTime() <= Date.now()
                    ? "Available immediately 🟢"
                    : "Scheduled (locked) 🔒",
                ],
                ...(form.expirationDate
                  ? [["Expires", new Date(form.expirationDate).toLocaleDateString()] as [string, string]]
                  : []),
                ...(form.isRecurring
                  ? [
                      ["Recurrence", `${form.recurrenceFrequency} × ${form.recurrenceCount}`] as [
                        string,
                        string,
                      ],
                    ]
                  : []),
                ...(form.message ? [["Message", form.message] as [string, string]] : []),
                ["Network", "Monad Testnet"],
              ].map(([k, v]) => (
                <div key={k}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "form" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={!form.recipient || !form.amount || Number(form.amount) <= 0 || !form.unlockDate}
              >
                Review gift
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("form")}>
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={loading}>
                {loading ? <RefreshCw className="animate-spin" /> : <Gift />}
                Send gift
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
function GiftsPage() {
  const [gifts, setGifts] = useState<GiftType[]>([]);
  const [loadingGifts, setLoadingGifts] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const { profile } = useProfile();

  // ─── Load & auto-update statuses ──────────────────────────────────────────
  const loadGifts = async (silent = false) => {
    if (!silent) setLoadingGifts(true);
    try {
      const data = await giftService.getGifts(profile?.id);
      // Auto-update any gifts whose status should have changed
      const now = Date.now();
      const toUpdate: Promise<void>[] = [];
      const updated = data.map((g) => {
        const live = resolveGiftStatus(g);
        if (live !== g.status) {
          toUpdate.push(giftService.updateGift(g.id, { status: live }, profile?.id));
          return { ...g, status: live };
        }
        return g;
      });
      if (toUpdate.length > 0) await Promise.allSettled(toUpdate);
      setGifts(updated);
    } catch (e) {
      toast.error("Failed to load gifts", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoadingGifts(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (profile?.id) {
      (async () => {
        setLoadingGifts(true);
        try {
          const data = await giftService.getGifts(profile.id);
          if (cancelled) return;
          const toUpdate: Promise<void>[] = [];
          const updated = data.map((g) => {
            const live = resolveGiftStatus(g);
            if (live !== g.status) {
              toUpdate.push(giftService.updateGift(g.id, { status: live }, profile.id));
              return { ...g, status: live };
            }
            return g;
          });
          if (toUpdate.length > 0) await Promise.allSettled(toUpdate);
          if (!cancelled) setGifts(updated);
        } catch (e) {
          if (!cancelled)
            toast.error("Failed to load gifts", {
              description: e instanceof Error ? e.message : "Unknown error",
            });
        } finally {
          if (!cancelled) setLoadingGifts(false);
        }
      })();
    } else {
      setLoadingGifts(false);
    }
    return () => { cancelled = true; };
  }, [profile?.id]);

  const sent = gifts.filter((g) => g.direction === "sent");
  const received = gifts.filter((g) => g.direction === "received");
  const claimable = gifts.filter(
    (g) => g.direction === "received" && resolveGiftStatus(g) === "available",
  );

  const handleCancel = async () => {
    if (!cancelId) return;
    try {
      await giftService.updateGift(cancelId, { status: "cancelled" }, profile?.id);
      setGifts((gs) =>
        gs.map((g) => (g.id === cancelId ? { ...g, status: "cancelled" as const } : g)),
      );
      toast("Gift cancelled");
    } catch (e) {
      toast.error("Failed to cancel gift", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setCancelId(null);
    }
  };

  const handleClaim = async (id: string) => {
    const claimedAt = new Date().toISOString();
    try {
      await giftService.updateGift(id, { status: "claimed", claimedAt }, profile?.id);
      setGifts((gs) =>
        gs.map((g) =>
          g.id === id ? { ...g, status: "claimed" as const, claimedAt } : g,
        ),
      );
      toast.success("Gift claimed! 🎉", { description: "Funds added to your wallet." });
    } catch (e) {
      toast.error("Failed to claim gift", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    }
  };

  const handleCreated = (gift: GiftType) => setGifts((gs) => [gift, ...gs]);

  return (
    <div className="space-y-8">
      <Reveal>
        <PageIntro
          title="Gifts"
          description="Send programmable crypto gifts — time-locked, recurring, or one-time."
        />
      </Reveal>

      {/* Stats */}
      <Reveal delay={40}>
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Gifts sent", value: sent.length, icon: Send },
            { label: "Gifts received", value: received.length, icon: Inbox },
            { label: "Claimable now", value: claimable.length, icon: CheckCircle2 },
            {
              label: "Total gifted",
              value: currency(sent.reduce((s, g) => s + g.amount, 0)),
              icon: Sparkles,
            },
          ].map((s) => (
            <section key={s.label} className="stat-card">
              <div className="flex items-start justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <s.icon className="size-5 text-primary" />
              </div>
              <p className="mt-5 text-2xl font-semibold">{s.value}</p>
            </section>
          ))}
        </div>
      </Reveal>

      {/* Claimable banner */}
      {claimable.length > 0 && (
        <Reveal delay={60}>
          <div className="flex items-center gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">
                You have {claimable.length} gift{claimable.length > 1 ? "s" : ""} available to
                claim
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-500">
                {claimable
                  .map((g) => `${currency(g.amount)} ${g.asset} from ${g.sender}`)
                  .join(" · ")}
              </p>
            </div>
          </div>
        </Reveal>
      )}

      {/* Action */}
      <Reveal delay={70}>
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Send a gift
          </Button>
        </div>
      </Reveal>

      {/* Tabs */}
      <Reveal delay={80}>
        {loadingGifts ? (
          <div className="flex min-h-32 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="sent">
            <TabsList className="mb-6">
              <TabsTrigger value="sent">
                <Send className="size-4" />
                Sent ({sent.length})
              </TabsTrigger>
              <TabsTrigger value="received">
                <Inbox className="size-4" />
                Received ({received.length})
              </TabsTrigger>
              <TabsTrigger value="upcoming">
                <CalendarDays className="size-4" />
                Upcoming ({gifts.filter((g) => resolveGiftStatus(g) === "scheduled").length})
              </TabsTrigger>
              <TabsTrigger value="expired">
                <XCircle className="size-4" />
                Expired
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sent">
              <div className="space-y-4">
                {sent.length === 0 ? (
                  <EmptyState
                    icon={Gift}
                    title="No gifts sent"
                    description="Create your first programmable gift."
                    action={
                      <Button onClick={() => setCreateOpen(true)}>
                        <Plus />
                        Send a gift
                      </Button>
                    }
                  />
                ) : (
                  sent.map((g) => (
                    <GiftCard
                      key={g.id}
                      gift={g}
                      onCancel={(id) => setCancelId(id)}
                      onClaim={handleClaim}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="received">
              <div className="space-y-4">
                {received.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="No gifts received"
                    description="You haven't received any programmable gifts yet."
                  />
                ) : (
                  received.map((g) => (
                    <GiftCard
                      key={g.id}
                      gift={g}
                      onCancel={(id) => setCancelId(id)}
                      onClaim={handleClaim}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="upcoming">
              <div className="space-y-4">
                {gifts.filter((g) => resolveGiftStatus(g) === "scheduled").length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="No upcoming gifts"
                    description="All scheduled gifts will appear here."
                  />
                ) : (
                  gifts
                    .filter((g) => resolveGiftStatus(g) === "scheduled")
                    .map((g) => (
                      <GiftCard
                        key={g.id}
                        gift={g}
                        onCancel={(id) => setCancelId(id)}
                        onClaim={handleClaim}
                      />
                    ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="expired">
              <div className="space-y-4">
                {gifts.filter((g) => resolveGiftStatus(g) === "expired").length === 0 ? (
                  <EmptyState
                    icon={XCircle}
                    title="No expired gifts"
                    description="Unclaimed gifts past their expiration date appear here."
                  />
                ) : (
                  gifts
                    .filter((g) => resolveGiftStatus(g) === "expired")
                    .map((g) => (
                      <GiftCard
                        key={g.id}
                        gift={g}
                        onCancel={(id) => setCancelId(id)}
                        onClaim={handleClaim}
                      />
                    ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </Reveal>

      <CreateGiftDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
        profileId={profile?.id}
        displayName={profile?.display_name ?? undefined}
        walletAddress={profile?.wallet_address ?? undefined}
      />

      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this gift?</AlertDialogTitle>
            <AlertDialogDescription>
              The gift will be cancelled and the recipient won't be able to claim it. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel gift
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
