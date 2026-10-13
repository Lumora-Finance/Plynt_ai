// src/hooks/use-profile.ts
import { useEffect, useRef, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { supabase, type Profile } from "@/lib/supabase";

/**
 * Syncs the current Privy user to the Supabase `profiles` table on login.
 *
 * - Waits for Privy to be ready AND authenticated before doing anything.
 * - Waits up to 15s for the embedded wallet to be created before upserting.
 *   If the wallet never arrives, upserts anyway with wallet_address = null.
 * - Re-upserts if the wallet address changes (wallet created after first upsert).
 *
 * Email resolution order (Privy stores it in different places):
 *   1. user.email?.address          — email OTP login
 *   2. user.google?.email           — Google OAuth
 *   3. linked accounts scan         — any other linked account with email
 */
export function useProfile() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Track the last wallet address we synced so we re-sync when it arrives
  const lastSyncedAddress = useRef<string | null | undefined>(undefined);

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const walletAddress = embeddedWallet?.address ?? user?.wallet?.address ?? null;

  useEffect(() => {
    if (!ready || !authenticated || !user || !supabase) {
      setLoading(false);
      return;
    }

    // Wait up to 15s for the embedded wallet to appear before we give up
    // and upsert without it. Re-run whenever walletAddress changes.
    let walletWaitTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    async function syncProfile(address: string | null) {
      if (!user || !supabase) return;
      setLoading(true);

      const privyDid = user.id;

      // ── Resolve email ──────────────────────────────────────────────────────
      const emailFromOtp = user.email?.address ?? null;
      const emailFromGoogle = (user.google as any)?.email ?? null;
      const emailFromLinked = (user.linkedAccounts ?? [])
        .map((a: any) => a.address ?? a.email ?? null)
        .find((e: string | null) => e && e.includes("@")) ?? null;

      const email = emailFromOtp ?? emailFromGoogle ?? emailFromLinked ?? null;

      // ── Resolve display name ───────────────────────────────────────────────
      const googleName = (user.google as any)?.name ?? null;
      const displayName = googleName ?? email ?? null;

      try {
        const upsertPayload: Record<string, unknown> = {
          privy_did: privyDid,
          wallet_address: address?.toLowerCase() ?? null,
        };
        if (displayName) upsertPayload['display_name'] = displayName;
        if (email) upsertPayload['email'] = email;

        const { data, error } = await supabase
          .from("profiles")
          .upsert(upsertPayload as any, { onConflict: "privy_did", ignoreDuplicates: false })
          .select()
          .single();

        if (!cancelled) {
          if (error) {
            console.error("[useProfile] upsert error:", error.message);
          } else {
            setProfile(data as Profile);
            lastSyncedAddress.current = address;
          }
        }
      } catch (e) {
        if (!cancelled) console.error("[useProfile] unexpected error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // If wallet is already available, sync immediately
    if (walletAddress !== null) {
      // Only re-sync if address changed
      if (lastSyncedAddress.current !== walletAddress) {
        syncProfile(walletAddress);
      } else {
        setLoading(false);
      }
    } else {
      // Wallet not yet available — wait up to 15s then sync without it
      walletWaitTimer = setTimeout(() => {
        if (!cancelled && lastSyncedAddress.current === undefined) {
          syncProfile(null);
        }
      }, 15_000);

      // If we haven't synced at all yet and no wallet, do a quick first sync
      // after 2s so the profile exists and the UI can render
      const quickSyncTimer = setTimeout(() => {
        if (!cancelled && lastSyncedAddress.current === undefined) {
          syncProfile(null);
        }
      }, 2_000);

      return () => {
        cancelled = true;
        if (walletWaitTimer) clearTimeout(walletWaitTimer);
        clearTimeout(quickSyncTimer);
      };
    }

    return () => {
      cancelled = true;
      if (walletWaitTimer) clearTimeout(walletWaitTimer);
    };
    // Re-run when wallet address changes so we update the profile row
  }, [ready, authenticated, user?.id, walletAddress]);

  const role = profile?.role ?? "user";
  const isAdmin = role === "admin";

  return { profile, role, isAdmin, loading } as const;
}
