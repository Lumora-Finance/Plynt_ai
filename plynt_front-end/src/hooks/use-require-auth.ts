import { usePrivy } from "@privy-io/react-auth";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Redirects unauthenticated users to the landing page (/).
 * Call this at the top of any protected component or in AppShell.
 *
 * Returns `{ ready, authenticated, user }` so callers can gate UI
 * without triggering the redirect themselves.
 *
 * OAuth callback handling:
 * After a Google sign-in Privy briefly goes through:
 *   ready: false  → loading
 *   ready: true, authenticated: false  → processing OAuth code
 *   ready: true, authenticated: true   → done
 *
 * If we redirect on the second step we cancel the OAuth handshake and the
 * user sees "Authentication failed". We avoid this by also checking for the
 * `privy_oauth_code` / `privy_oauth_state` / `privy_oauth_provider` query
 * params that Privy writes into the URL during the OAuth callback — if any
 * are present we hold off redirecting until Privy resolves them.
 */
export function useRequireAuth() {
  const { ready, authenticated, user } = usePrivy();
  const navigate = useNavigate();
  const { pathname, search } = useRouterState({ select: (s) => s.location });

  // Detect whether we are in the middle of an OAuth callback
  const isOAuthCallback =
    search.includes("privy_oauth_code") ||
    search.includes("privy_oauth_state") ||
    search.includes("privy_oauth_provider") ||
    search.includes("code=") ||        // generic OAuth code param
    search.includes("state=");          // generic OAuth state param

  useEffect(() => {
    // Don't redirect while Privy is still loading
    if (!ready) return;
    // Never redirect away from the landing page
    if (pathname === "/") return;
    // Hold off while we're in the OAuth callback — Privy will update
    // `authenticated` to true once it processes the tokens
    if (isOAuthCallback) return;
    // Redirect unauthenticated users to login
    if (!authenticated) {
      navigate({ to: "/" });
    }
  }, [ready, authenticated, pathname, navigate, isOAuthCallback]);

  return { ready, authenticated, user };
}
