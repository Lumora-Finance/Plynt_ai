import { usePrivy } from "@privy-io/react-auth";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

/**
 * Redirects unauthenticated users to the landing page (/).
 *
 * The two failure modes we protect against:
 *
 * 1. OAuth callback race — after Google sign-in, Privy redirects back to the
 *    app with ?code=...&state=... in the URL. At that point Privy briefly
 *    shows ready:true, authenticated:false while it exchanges the code.
 *    If we redirect immediately the OAuth handshake breaks and the user sees
 *    "Authentication failed". We detect the OAuth params and skip redirecting.
 *
 * 2. Wallet creation lag — Privy creates the embedded wallet asynchronously
 *    after first login. `useWallets()` returns [] for a short window. We
 *    don't redirect here (we already have authenticated:true at this point).
 */
export function useRequireAuth() {
  const { ready, authenticated, user } = usePrivy();
  const navigate = useNavigate();
  const { pathname, search } = useRouterState({ select: (s) => s.location });

  // Safely convert search to a string regardless of shape (string | object)
  const searchStr =
    typeof search === "string"
      ? search
      : search
      ? JSON.stringify(search)
      : "";

  // Detect whether Privy is mid-OAuth-callback
  const isOAuthCallback =
    searchStr.includes("privy_oauth_code") ||
    searchStr.includes("privy_oauth_state") ||
    searchStr.includes("privy_oauth_provider") ||
    // Standard OAuth params used by Privy's Google flow
    searchStr.includes("code=") ||
    searchStr.includes('"code"') ||
    searchStr.includes("code%3D") ||
    searchStr.includes("state=") ||
    searchStr.includes('"state"') ||
    searchStr.includes("state%3D");

  // Grace-period flag: once we detect an OAuth callback, hold off redirecting
  // for a few seconds to let Privy finish processing the code.
  const oauthSeen = useRef(false);
  const oauthGraceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (isOAuthCallback) {
    oauthSeen.current = true;
    // Reset grace timer each render while params are present
    if (oauthGraceRef.current) clearTimeout(oauthGraceRef.current);
    oauthGraceRef.current = setTimeout(() => {
      oauthSeen.current = false;
    }, 10_000); // 10 s grace — more than enough for Privy to exchange the code
  }

  useEffect(() => {
    // Still loading — never redirect prematurely
    if (!ready) return;
    // On the landing page itself — nothing to do
    if (pathname === "/") return;
    // Mid-OAuth or grace period — wait it out
    if (isOAuthCallback || oauthSeen.current) return;
    // Authenticated — all good
    if (authenticated) return;

    // Unauthenticated on a protected page — send them home
    navigate({ to: "/" });
  }, [ready, authenticated, pathname, navigate, isOAuthCallback]);

  // Clean up grace timer on unmount
  useEffect(() => {
    return () => {
      if (oauthGraceRef.current) clearTimeout(oauthGraceRef.current);
    };
  }, []);

  return { ready, authenticated, user };
}
