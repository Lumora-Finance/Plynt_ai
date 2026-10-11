import { usePrivy } from "@privy-io/react-auth";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Redirects unauthenticated users to the landing page (/).
 * Call this at the top of any protected component or in AppShell.
 *
 * Returns `{ ready, authenticated, user }` so callers can gate UI
 * without triggering the redirect themselves.
 */
export function useRequireAuth() {
  const { ready, authenticated, user } = usePrivy();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    // Don't redirect while Privy is still loading
    if (!ready) return;
    // Landing page is the auth gate — never redirect away from it
    if (path === "/") return;
    // Redirect unauthenticated users to login
    if (!authenticated) {
      navigate({ to: "/" });
    }
  }, [ready, authenticated, path, navigate]);

  return { ready, authenticated, user };
}
