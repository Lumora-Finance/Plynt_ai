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

// ─── Main landing / auth gate ─────────────────────────────────────────────────

export function LandingPage() {
  const { ready, authenticated, login } = usePrivy();
  const navigate = useNavigate();

  // Once authenticated, redirect straight into the app
  useEffect(() => {
    if (ready && authenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [ready, authenticated, navigate]);

  const handleEmailLogin = () => {
    login({ loginMethods: ["email"] });
  };

  // Show spinner while Privy is initialising
  if (!ready) {
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
            Loading…
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

        {/* Auth button — email only */}
        <div className="flex w-full flex-col gap-3">
          <button
            onClick={handleEmailLogin}
            disabled={!ready}
            className="btn-monad-primary w-full"
            aria-label="Continue with Email"
          >
            <Mail className="size-4" />
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
