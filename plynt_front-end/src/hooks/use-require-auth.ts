import { usePrivy } from "@privy-io/react-auth";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

/**
 * Redirects unauthenticated users to the landing page (/).
 *
 * Key rules:
 * 1. Never redirect during SSR — only on the client after mount
 * 2. Never redirect during an OAuth callback (code= / state= in URL)
 * 3. Never redirect while Privy is still loading (ready = false)
 */
export function useRequireAuth() {
  const { ready, authenticated, user } = usePrivy();
  const navigate = useNavigate();
  const { pathname, search } = useRouterState({ select: (s) => s.location });

  // SSR safety — never navigate on the server
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

  // Grace-period: once OAuth params detected, hold off redirecting for 15s
  const oauthSeen = useRef(false);
  const oauthGraceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (isOAuthCallback) {
    oauthSeen.current = true;
    if (oauthGraceRef.current) clearTimeout(oauthGraceRef.current);
    oauthGraceRef.current = setTimeout(() => {
      oauthSeen.current = false;
    }, 15_000);
  }

  useEffect(() => {
    // Client-only — never during SSR
    if (!isClient) return;
    // Still loading
    if (!ready) return;
    // Public pages
    if (pathname === "/" || pathname === "/terms" || pathname === "/privacy") return;
    // Mid-OAuth or grace period
    if (isOAuthCallback || oauthSeen.current) return;
    // Authenticated
    if (authenticated) return;

    // Unauthenticated on protected page → send home
    navigate({ to: "/" });
  }, [ready, authenticated, pathname, navigate, isOAuthCallback, isClient]);

  useEffect(() => {
    return () => {
      if (oauthGraceRef.current) clearTimeout(oauthGraceRef.current);
    };
  }, []);

  return { ready, authenticated, user };
}
