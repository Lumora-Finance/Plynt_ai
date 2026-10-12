import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Users,
  ShieldCheck,
  Activity,
  ReceiptText,
  Gift,
  TrendingUp,
  Loader2,
  Search,
  Crown,
  UserRound,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageIntro } from "@/components/shared/common";
import { Reveal } from "@/components/shared/motion";
import { supabase, type Profile } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — PLYNT" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <section className="stat-card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function AdminPage() {
  const { isAdmin, loading: profileLoading } = useProfile();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [promoting, setPromoting] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load users", { description: error.message });
    } else {
      setUsers(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!profileLoading && isAdmin) {
      fetchUsers();
    } else if (!profileLoading && !isAdmin) {
      setLoading(false);
    }
  }, [profileLoading, isAdmin]);

  const toggleRole = async (user: Profile) => {
    if (!supabase) return;
    const newRole: import("@/lib/supabase").UserRole = user.role === "admin" ? "user" : "admin";
    setPromoting(user.id);
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", user.id);
    setPromoting(null);
    if (error) {
      toast.error("Failed to update role", { description: error.message });
    } else {
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
      toast.success(`${user.display_name ?? user.email ?? "User"} is now ${newRole}`);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || (u.display_name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.wallet_address ?? "").toLowerCase().includes(q) ||
      u.privy_did.toLowerCase().includes(q);
  });

  const adminCount = users.filter((u) => u.role === "admin").length;
  const userCount = users.length - adminCount;

  // ── Access guard ──────────────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
        <ShieldCheck className="size-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Access denied</h2>
        <p className="text-sm text-muted-foreground">You need admin privileges to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <Reveal>
        <PageIntro
          title="Admin Panel"
          description="Manage users, roles, and platform activity."
          action={
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin size-4" : "size-4"} />
              Refresh
            </Button>
          }
        />
      </Reveal>

      {/* Stats */}
      <Reveal delay={40}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label="Total users" value={users.length} sub="All registered profiles" />
          <StatCard icon={Crown} label="Admins" value={adminCount} sub="Users with admin role" />
          <StatCard icon={UserRound} label="Regular users" value={userCount} sub="Users with user role" />
          <StatCard icon={Activity} label="Platform" value="Live" sub="Monad Testnet" />
        </div>
      </Reveal>

      {/* Users table */}
      <Reveal delay={80}>
        <section className="panel space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">All users</h2>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, address…"
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-32 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-24 items-center justify-center border border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                {users.length === 0 ? "No users have signed in yet." : "No users match your search."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden border border-border">
              {/* Header */}
              <div className="hidden grid-cols-[1fr_200px_140px_100px_120px] gap-4 bg-muted px-4 py-3 text-xs font-medium text-muted-foreground md:grid">
                <span>User</span>
                <span>Wallet</span>
                <span>Joined</span>
                <span>Role</span>
                <span />
              </div>
              {filtered.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-1 gap-2 border-t border-border px-4 py-3 text-sm transition-colors hover:bg-muted/30 md:grid-cols-[1fr_200px_140px_100px_120px] md:items-center md:gap-4"
                >
                  {/* Identity */}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.display_name ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email ?? user.privy_did}</p>
                  </div>

                  {/* Wallet */}
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {user.wallet_address
                      ? `${user.wallet_address.slice(0, 8)}…${user.wallet_address.slice(-6)}`
                      : "—"}
                  </p>

                  {/* Joined */}
                  <p className="text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>

                  {/* Role badge */}
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}
                    className="w-fit capitalize"
                  >
                    {user.role === "admin" && <Crown className="mr-1 size-3" />}
                    {user.role}
                  </Badge>

                  {/* Action */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full md:w-auto"
                    disabled={promoting === user.id}
                    onClick={() => toggleRole(user)}
                  >
                    {promoting === user.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : user.role === "admin" ? (
                      "Demote"
                    ) : (
                      "Make admin"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {/* Platform overview */}
      <Reveal delay={120}>
        <section className="panel">
          <h2 className="section-title mb-5">Platform overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ReceiptText, label: "Invoices", desc: "User-created payment requests stored in Supabase" },
              { icon: Gift, label: "Gifts", desc: "Time-locked programmable gifts on Monad" },
              { icon: TrendingUp, label: "Salary", desc: "Salary config and distribution records" },
              { icon: ShieldCheck, label: "Security", desc: "RLS policies active on all tables" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex flex-col gap-2 rounded-md border border-border p-4">
                <Icon className="size-5 text-primary" />
                <p className="font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
