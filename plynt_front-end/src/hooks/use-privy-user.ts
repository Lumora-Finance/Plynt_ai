import { usePrivy, useWallets } from "@privy-io/react-auth";

/** Shorten an EVM address: 0x1234…5678 */
function shortenAddress(addr: string, head = 6, tail = 4): string {
  if (!addr || addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/** Derive two-letter initials from a name or email */
function toInitials(name?: string | null, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
    }
    return (parts[0] ?? "PL").slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "PL";
}

/**
 * Centralised hook that derives all display-ready info from the Privy user object.
 *
 * Returned shape:
 *   ready          — whether Privy has finished loading
 *   authenticated  — whether the user is signed in
 *   user           — raw Privy user object (or null)
 *   displayName    — Google name > email > "Plynt User"
 *   initials       — two-letter initials for Avatar fallback
 *   email          — user's email address if available
 *   walletAddress  — embedded wallet address (full)
 *   shortAddress   — shortened wallet address for display
 *   joinedAt       — Date the user was created (from Privy user.createdAt)
 */
export function usePrivyUser() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  const email = user?.email?.address;
  const googleName = user?.google?.name;

  const displayName = googleName ?? email ?? "Plynt User";
  const initials = toInitials(googleName, email);

  // Prefer the Privy embedded wallet; fall back to any linked wallet
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const walletAddress =
    embeddedWallet?.address ?? user?.wallet?.address ?? undefined;
  const shortAddress = walletAddress ? shortenAddress(walletAddress) : "No wallet";

  // user.createdAt is a Date object in Privy v3
  const joinedAt: Date | undefined = user?.createdAt ?? undefined;

  return {
    ready,
    authenticated,
    user,
    displayName,
    initials,
    email,
    walletAddress,
    shortAddress,
    joinedAt,
  } as const;
}
