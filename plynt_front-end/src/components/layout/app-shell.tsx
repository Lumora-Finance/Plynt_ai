import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Bell,
  ChartNoAxesCombined,
  CircleHelp,
  Gift,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  WalletCards,
  LogOut,
  UserRound,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "./theme-toggle";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Nav items ────────────────────────────────────────────────────────────────

const primary = [
  { to: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { to: "/wallet",       label: "Wallet",        icon: WalletCards },
  { to: "/transactions", label: "Transactions",  icon: ArrowLeftRight },
  { to: "/invoices",     label: "Invoices",      icon: ReceiptText },
  { to: "/salary",       label: "Salary",        icon: TrendingUp },
  { to: "/gifts",        label: "Gifts",         icon: Gift },
  { to: "/analytics",    label: "Analytics",     icon: ChartNoAxesCombined },
  { to: "/assistant",    label: "AI Assistant",  icon: Sparkles },
] as const;

const secondary = [
  { to: "/settings", label: "Settings", icon: Settings2 },
  { to: "/help",     label: "Help",     icon: CircleHelp },
] as const;

const titles: Record<string, string> = {
  dashboard:    "Dashboard",
  wallet:       "Wallet",
  transactions: "Transactions",
  invoices:     "Invoices",
  salary:       "Salary",
  gifts:        "Gifts",
  analytics:    "Analytics",
  assistant:    "AI Assistant",
  settings:     "Settings",
  profile:      "Profile",
  help:         "Help",
  admin:        "Admin Panel",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Shorten an EVM address: 0x1234…5678 */
function shortenAddress(addr: string, head = 6, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/** Derive initials from an email or name */
function initials(name?: string, email?: string): string {
  if (name) return name.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "PL";
}

// ─── Brand ────────────────────────────────────────────────────────────────────

function Brand() {
  return (
    <div className="flex h-16 items-center gap-3 px-5">
      <img src="/plynt_logoo.png" alt="PLYNT" className="size-11 object-contain" />
      <div>
        <p className="font-semibold leading-none" style={{ fontFamily: "'Sancreek', serif" }}>PLYNT</p>
        <p className="mt-1 text-xs text-muted-foreground">AI Financial Workspace</p>
      </div>
    </div>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function Navigation({ close, isAdmin }: { close?: () => void; isAdmin?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex h-full flex-col overflow-y-auto px-3 pb-4">
      <div className="space-y-0.5">
        {primary.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={close}
            className={cn("nav-item", path.startsWith(item.to) && "nav-item-active")}
          >
            <item.icon className="size-5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
      <div className="mt-auto space-y-0.5 border-t border-border pt-4">
        {secondary.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={close}
            className={cn("nav-item", path.startsWith(item.to) && "nav-item-active")}
          >
            <item.icon className="size-5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}
        {isAdmin && (
          <Link
            to="/admin"
            onClick={close}
            className={cn(
              "nav-item mt-1 border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10",
              path.startsWith("/admin") && "nav-item-active",
            )}
          >
            <ShieldCheck className="size-5 shrink-0" />
            <span>Admin Panel</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { ready, user } = useRequireAuth();
  const { logout } = usePrivy();
  const { wallets } = useWallets();
  const { isAdmin } = useProfile();

  // Landing page: render without nav chrome, no auth check needed
  if (path === "/") {
    return <>{children}</>;
  }

  // While Privy is loading, show a minimal full-screen spinner
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Derive user display info ───────────────────────────────────────────────
  const email = user?.email?.address;
  const googleName = user?.google?.name;
  const displayName = googleName ?? email ?? "Plynt User";
  const displayInitials = initials(googleName ?? undefined, email);

  // First embedded wallet address (created on login)
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const walletAddress = embeddedWallet?.address ?? user?.wallet?.address ?? undefined;
  const displayAddress = walletAddress ? shortenAddress(walletAddress) : "No wallet";

  const handleLogout = async () => {
    await logout();
    toast("Signed out successfully");
  };

  const segment = path.split("/")[1] || "dashboard";

  // Mobile nav: 5 most important routes
  const mobileNav = [
    { to: "/dashboard",    label: "Dashboard", icon: LayoutDashboard },
    { to: "/wallet",       label: "Wallet",    icon: WalletCards },
    { to: "/transactions", label: "Txns",      icon: ArrowLeftRight },
    { to: "/gifts",        label: "Gifts",     icon: Gift },
    { to: "/assistant",    label: "AI",        icon: Sparkles },
  ] as const;

  return (
    <div className="relative min-h-screen text-foreground bg-background">

      {/* ── Backdrop ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          maskImage: "linear-gradient(to right, transparent 0, #000 min(300px, 32%), #000 calc(100% - min(300px, 32%)), transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0, #000 min(300px, 32%), #000 calc(100% - min(300px, 32%)), transparent 100%)",
        }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0, #000 min(380px, 45%))",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 min(380px, 45%))",
          }}
        >
          <div
            className="absolute inset-0 isolate dark:block hidden"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 2003.55px 741.89px at 50% calc(100% - 354.135px + 25%), rgb(20, 22, 36) 0%, rgb(13, 14, 21) 37.26%, rgb(8, 11, 14) 55.89%, rgb(5, 7, 6) 74.52%)",
            }}
          >
            <div
              className="absolute inset-0 mix-blend-soft-light"
              style={{
                backgroundImage: "url(/banner-noise.webp)",
                backgroundSize: "180px auto",
                backgroundPosition: "0 100%",
                opacity: 0.8,
              }}
            />
          </div>
          <div
            className="absolute inset-0 isolate dark:hidden block"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 2003.55px 741.89px at 50% calc(100% - 354.135px + 25%), rgb(225, 222, 255) 0%, rgb(235, 232, 255) 37.26%, rgb(244, 244, 248) 55.89%, rgb(244, 244, 248) 74.52%)",
            }}
          >
            <div
              className="absolute inset-0 mix-blend-soft-light"
              style={{
                backgroundImage: "url(/banner-noise.webp)",
                backgroundSize: "180px auto",
                backgroundPosition: "0 100%",
                opacity: 0.3,
              }}
            />
          </div>
          <div
            className="absolute inset-0 dark:hidden"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(0,0,0,0.07) 0 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.07) 0 1px, transparent 1px)",
              backgroundSize: "80px 80px",
              backgroundPosition: "0 100%",
              opacity: 0.5,
            }}
          />
          <div
            className="absolute inset-0 hidden dark:block"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.09) 0 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.09) 0 1px, transparent 1px)",
              backgroundSize: "80px 80px",
              backgroundPosition: "0 100%",
              opacity: 0.2,
            }}
          />
        </div>
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
        <Brand />
        <Navigation isAdmin={isAdmin} />
      </aside>

      <div className="relative z-10 lg:pl-64">
        {/* ── Header ── */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Open navigation" className="min-h-11 min-w-11 lg:hidden">
                      <Menu />
                    </Button>
                  </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent>Open navigation</TooltipContent>
              </Tooltip>
              <SheetContent side="left" className="flex w-72 flex-col p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                  <SheetDescription>Navigate PLYNT</SheetDescription>
                </SheetHeader>
                <Brand />
                <Navigation close={() => setMenuOpen(false)} isAdmin={isAdmin} />
              </SheetContent>
            </Sheet>
            <h2 className="text-base font-semibold md:text-lg">{titles[segment] ?? "PLYNT"}</h2>
          </div>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Notifications"
                  className="relative min-h-11 min-w-11"
                  onClick={() =>
                    toast("You're all caught up", {
                      description: "No new wallet or invoice activity.",
                    })
                  }
                >
                  <Bell />
                  <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>

            <ThemeToggle />

            {/* Wallet address pill */}
            <Button
              variant="outline"
              className="hidden md:inline-flex font-mono text-xs"
              onClick={() => {
                if (walletAddress) {
                  navigator.clipboard?.writeText(walletAddress);
                  toast("Wallet address copied", { description: walletAddress });
                }
              }}
            >
              <Wallet className="size-4" />
              <span>{displayAddress}</span>
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11"
                      aria-label="Profile"
                    >
                      <Avatar className="size-8">
                        <AvatarFallback>{displayInitials}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Profile</TooltipContent>
              </Tooltip>

              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  {email && (
                    <p className="truncate text-xs text-muted-foreground">{email}</p>
                  )}
                  {walletAddress && (
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                      {shortenAddress(walletAddress)}
                    </p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <UserRound />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings2 />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 pb-24 md:px-6 md:py-8 lg:px-8 lg:pb-8">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 px-2 py-1 backdrop-blur-xl lg:hidden">
        {mobileNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn("mobile-nav", path.startsWith(item.to) && "text-primary")}
          >
            <item.icon className="size-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
