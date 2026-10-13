import { usePrivy } from "@privy-io/react-auth";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

/**
 * Redirects unauthenticated users to the landing page (/).
 *
 * Key rules:
 * 1. Never redirect during SSR — only on the client after mount
 * 2. Never redirect during an OAuth callback (code= / state= in URL)
 * 3. Never redirect while Privy is still loading (ready = false)
 * 4. Grace period: after OAuth params are detected, hold off for 20s
 *    to give Privy enough time to complete the OAuth flow and become
 *    authenticated before we ever consider redirecting.
 */
export function useRequireAuth() {
  const { ready, authenticated, user } = usePrivy();
  const navigate = useNavigate();
  const { pathname, search } = useRouterState({ select: (s) => s.location });

  // SSR safety
  const isClient = typeof window !== "undefined";

  // Safely convert search to a string
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
    searchStr.includes("code=") ||
    searchStr.includes('"code"') ||
    searchStr.includes("code%3D") ||
    searchStr.includes("state=") ||
    searchStr.includes('"state"') ||
    searchStr.includes("state%3D");

  // Grace period state: once OAuth params are seen, block redirects for 20s
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOAuthCallback) return;

    // Start / reset the grace period timer
    setInGracePeriod(true);
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    graceTimerRef.current = setTimeout(() => {
      setInGracePeriod(false);
    }, 20_000);
  }, [isOAuthCallback]);

  // Also start grace period on mount if we're already on a protected page
  // and Privy is not yet ready — this covers page refreshes mid-session
  const mountGraceRef = useRef(false);
  const [mountGrace, setMountGrace] = useState(true);

  useEffect(() => {
    if (mountGraceRef.current) return;
    mountGraceRef.current = true;

    // Give Privy 8 seconds on initial mount before we allow any redirect
    const t = setTimeout(() => setMountGrace(false), 8_000);
    return () => clearTimeout(t);
  }, []);

  // Clear grace period immediately once authenticated
  useEffect(() => {
    if (authenticated) {
      setInGracePeriod(false);
      setMountGrace(false);
    }
  }, [authenticated]);

  useEffect(() => {
    // Client-only
    if (!isClient) return;
    // Still loading
    if (!ready) return;
    // Public pages
    if (pathname === "/" || pathname === "/terms" || pathname === "/privacy") return;
    // Mid-OAuth or grace period or mount grace
    if (isOAuthCallback || inGracePeriod || mountGrace) return;
    // Authenticated
    if (authenticated) return;

    // Unauthenticated on protected page → send home
    navigate({ to: "/" });
  }, [ready, authenticated, pathname, navigate, isOAuthCallback, inGracePeriod, mountGrace, isClient]);

  useEffect(() => {
    return () => {
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    };
  }, []);

  return { ready, authenticated, user };
}
