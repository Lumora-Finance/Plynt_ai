// src/hooks/use-profile.ts
import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { supabase, type Profile } from "@/lib/supabase";

/**
 * Syncs the current Privy user to the Supabase `profiles` table on first login
 * and on wallet changes. Exposes the full profile row including the user's role.
 *
 * Usage:
 *   const { profile, role, isAdmin, loading } = useProfile();
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

    // Capture non-null client for this closure
    const client = supabase;
    let cancelled = false;

    async function syncProfile() {
      if (!user) return;
      setLoading(true);

      const privyDid = user.id; // stable DID: "did:privy:clxxx..."
      const email = user.email?.address ?? null;
      const displayName = (user.google?.name as string | undefined) ?? email ?? null;

      try {
        const { data, error } = await client
          .from("profiles")
          .upsert(
            {
              privy_did: privyDid,
              wallet_address: walletAddress?.toLowerCase() ?? null,
              display_name: displayName,
              email,
            } satisfies import("@/lib/supabase").Database["public"]["Tables"]["profiles"]["Insert"],
            { onConflict: "privy_did", ignoreDuplicates: false },
          )
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
