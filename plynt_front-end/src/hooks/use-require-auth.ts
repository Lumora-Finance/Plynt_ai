import { usePrivy } from "@privy-io/react-auth";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Redirects unauthenticated users to the landing page (/).
 *
 * OAuth callback handling:
 * After a Google sign-in Privy briefly goes through:
 *   ready: false  → loading
 *   ready: true, authenticated: false  → processing OAuth code
 *   ready: true, authenticated: true   → done
 *
 * If we redirect on the second step we cancel the OAuth handshake and the
 * user sees "Authentication failed". We detect this by checking for Privy's
 * OAuth query params in the URL search string.
 *
 * SSR note: on the server, `location.search` is a parsed object (Record),
 * not a string — so we must stringify it before calling .includes().
 */
export function useRequireAuth() {
  const { ready, authenticated, user } = usePrivy();
  const navigate = useNavigate();
  const { pathname, search } = useRouterState({ select: (s) => s.location });

  // Safely stringify search regardless of whether it's a string or object
  const searchStr = typeof search === "string" ? search : JSON.stringify(search ?? "");

  // Detect whether we are in the middle of an OAuth callback
  const isOAuthCallback =
    searchStr.includes("privy_oauth_code") ||
    searchStr.includes("privy_oauth_state") ||
    searchStr.includes("privy_oauth_provider") ||
    searchStr.includes("code=") ||
    searchStr.includes('"code"') ||   // object form: { code: "..." }
    searchStr.includes("state=") ||
    searchStr.includes('"state"');     // object form: { state: "..." }

  useEffect(() => {
    if (!ready) return;
    if (pathname === "/") return;
    if (isOAuthCallback) return;
    if (!authenticated) {
      navigate({ to: "/" });
    }
  }, [ready, authenticated, pathname, navigate, isOAuthCallback]);

  return { ready, authenticated, user };
}
