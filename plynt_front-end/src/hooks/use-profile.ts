// src/hooks/use-profile.ts
import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { supabase, type Profile } from "@/lib/supabase";

/**
 * Syncs the current Privy user to the Supabase `profiles` table on login.
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

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const walletAddress = embeddedWallet?.address ?? user?.wallet?.address ?? null;

  useEffect(() => {
    if (!ready || !authenticated || !user || !supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;
    let cancelled = false;

    async function syncProfile() {
      if (!user) return;
      setLoading(true);

      const privyDid = user.id;

      // ── Resolve email from all possible Privy sources ─────────────────────
      const emailFromOtp = user.email?.address ?? null;
      const emailFromGoogle = (user.google as any)?.email ?? null;
      // Scan linked accounts for any email address
      const emailFromLinked = (user.linkedAccounts ?? [])
        .map((a: any) => a.address ?? a.email ?? null)
        .find((e: string | null) => e && e.includes("@")) ?? null;

      const email = emailFromOtp ?? emailFromGoogle ?? emailFromLinked ?? null;

      // ── Resolve display name ───────────────────────────────────────────────
      const googleName = (user.google as any)?.name ?? null;
      const displayName = googleName ?? email ?? null;

      try {
        // Upsert — only overwrite email/display_name if we have a value.
        // Use a two-step approach: upsert what we know, then fetch the full row.
        const upsertPayload: Record<string, unknown> = {
          privy_did: privyDid,
          wallet_address: walletAddress?.toLowerCase() ?? null,
        };
        // Only write these if we actually have values (don't overwrite with null)
        if (displayName) upsertPayload.display_name = displayName;
        if (email) upsertPayload.email = email;

        const { data, error } = await client
          .from("profiles")
          .upsert(upsertPayload as any, { onConflict: "privy_did", ignoreDuplicates: false })
          .select()
          .single();

        if (!cancelled) {
          if (error) {
            console.error("[useProfile] upsert error:", error.message);
          } else {
            setProfile(data as Profile);
          }
        }
      } catch (e) {
        if (!cancelled) console.error("[useProfile] unexpected error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    syncProfile();
    return () => { cancelled = true; };
  }, [ready, authenticated, user?.id, walletAddress]);

  const role = profile?.role ?? "user";
  const isAdmin = role === "admin";

  return { profile, role, isAdmin, loading } as const;
}
