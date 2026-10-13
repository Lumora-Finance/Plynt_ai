import { usePrivy } from "@privy-io/react-auth";
import { useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Mail } from "lucide-react";

// ─── Decorative components ────────────────────────────────────────────────────

function GridTexture() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 flex flex-col justify-between"
        style={{ opacity: 0.18 }}
        aria-hidden="true"
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="h-px w-full shrink-0" style={{ background: "#2A2A2E" }} />
        ))}
      </div>
      <div
        className="pointer-events-none absolute inset-0 flex flex-row justify-between"
        style={{ opacity: 0.14 }}
        aria-hidden="true"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="h-full w-px shrink-0" style={{ background: "#2A2A2E" }} />
        ))}
      </div>
    </>
  );
}

function Corners({ color = "#8A8A93" }: { color?: string }) {
  const s = (a: string, b: string) => ({
    [`border${(a[0] ?? "").toUpperCase() + a.slice(1)}`]: `1px solid ${color}`,
    [`border${(b[0] ?? "").toUpperCase() + b.slice(1)}`]: `1px solid ${color}`,
  });
  return (
    <>
      <span className="absolute left-0 top-0 size-5"     style={s("top", "left")}     aria-hidden="true" />
      <span className="absolute right-0 top-0 size-5"    style={s("top", "right")}    aria-hidden="true" />
      <span className="absolute bottom-0 left-0 size-5"  style={s("bottom", "left")}  aria-hidden="true" />
      <span className="absolute bottom-0 right-0 size-5" style={s("bottom", "right")} aria-hidden="true" />
    </>
  );
}

// ─── Google logo ──────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" />
    </svg>
  );
}

// ─── Main landing / auth gate ─────────────────────────────────────────────────

export function LandingPage() {
  const { ready, authenticated, login } = usePrivy();
  const navigate = useNavigate();

  // Detect if we're on an OAuth callback (Privy returned from Google)
  const searchStr = typeof window !== "undefined" ? window.location.search : "";
  const isOAuthCallback =
    searchStr.includes("privy_oauth_code") ||
    searchStr.includes("privy_oauth_state") ||
    searchStr.includes("privy_oauth_provider") ||
    searchStr.includes("code=") ||
    searchStr.includes("state=");

  // Once authenticated, redirect straight into the app
  useEffect(() => {
    if (ready && authenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [ready, authenticated, navigate]);

  // Show a loading spinner while:
  // - Privy is not yet ready
  // - We're on an OAuth callback (waiting for Privy to process it)
  const isLoading = !ready || isOAuthCallback;

  const handleEmailLogin = () => {
    login({ loginMethods: ["email"] });
  };

  const handleGoogleLogin = () => {
    login({ loginMethods: ["google"] });
  };

  // While processing OAuth callback, show a full-screen spinner
  // instead of the login buttons (prevents flashing and double-login)
  if (isLoading) {
    return (
      <div
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
        style={{ background: "#000000" }}
      >
        <GridTexture />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <img src="/plynt_logoo.png" alt="PLYNT" className="size-12 object-contain" />
          <div className="size-6 animate-spin rounded-full border-2 border-[#836EF9] border-t-transparent" />
          <p className="text-xs" style={{ color: "#727285", fontFamily: "var(--font-mono)" }}>
            {isOAuthCallback ? "Completing sign in…" : "Loading…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{ background: "#000000" }}
    >
      <GridTexture />

      {/* Purple top glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-96"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, #8270FF14 0%, transparent 70%)",
        }}
      />

      {/* Bordered content box with corner brackets */}
      <div
        className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8 px-8 py-12"
        style={{ border: "1px solid #26262B" }}
      >
        <Corners />

        <img src="/plynt_logoo.png" alt="PLYNT" className="size-16 object-contain" />

        <div>
          <h1
            className="text-5xl font-bold tracking-tight"
            style={{ fontFamily: "'Sancreek', serif", color: "#FBFAF9" }}
          >
            PLYNT
          </h1>
          <p
            className="mt-3 text-sm"
            style={{ fontFamily: "var(--font-mono)", color: "#727285" }}
          >
            AI Financial Workspace · Monad
          </p>
        </div>

        {/* Auth buttons */}
        <div className="flex w-full flex-col gap-3">
          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={!ready}
            className="btn-monad-primary w-full"
            aria-label="Continue with Google"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <span className="h-px flex-1" style={{ background: "#26262B" }} />
            <span className="text-xs" style={{ color: "#565666", fontFamily: "var(--font-mono)" }}>
              or
            </span>
            <span className="h-px flex-1" style={{ background: "#26262B" }} />
          </div>

          {/* Email */}
          <button
            onClick={handleEmailLogin}
            disabled={!ready}
            className="flex w-full items-center justify-center gap-2 rounded-none py-3 text-sm font-medium transition-colors"
            style={{
              border: "1px solid #26262B",
              background: "transparent",
              color: "#FBFAF9",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#111114";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
            aria-label="Continue with Email"
          >
            <Mail className="size-4" style={{ color: "#836EF9" }} />
            Continue with Email
          </button>
        </div>

        {/* Fine print */}
        <p
          className="text-center text-xs leading-relaxed"
          style={{ color: "#565666", fontFamily: "var(--font-mono)" }}
        >
          By continuing you agree to Plynt's{" "}
          <Link
            to="/terms"
            style={{ color: "#8270FF" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none"; }}
          >
            Terms of Service
          </Link>
          {" "}and{" "}
          <Link
            to="/privacy"
            style={{ color: "#8270FF" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none"; }}
          >
            Privacy Policy
          </Link>.
        </p>
      </div>

      {/* Bottom meta */}
      <div
        className="absolute bottom-6 left-0 right-0 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 px-6"
        style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}
      >
        {(
          [
            ["Network", "Monad Testnet"],
            ["Chain ID", "10143"],
            ["Auth", "Privy"],
          ] as [string, string][]
        ).map(([l, v]) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span style={{ color: "#565666" }}>{l} ·</span>
            <span style={{ color: "#727285" }}>{v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
