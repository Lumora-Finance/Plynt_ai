import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Lock, Monitor, Moon, Sun, UserRound, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageIntro, shorten } from "@/components/shared/common";
import { useTheme, type Theme } from "@/components/layout/theme-provider";
import { usePrivyUser } from "@/hooks/use-privy-user";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — PLYNT" },
      { name: "description", content: "Manage your PLYNT account and preferences." },
      { property: "og:title", content: "Settings — PLYNT" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function SettingRow({ label }: { label: string }) {
  const [enabled, setEnabled] = useState(false);
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm">{label}</span>
      <Switch checked={enabled} onCheckedChange={setEnabled} />
    </div>
  );
}

function Page() {
  const { theme, setTheme } = useTheme();
  const { displayName, email, walletAddress } = usePrivyUser();

  return (
    <div className="space-y-7">
      <PageIntro title="Settings" description="Manage your account and preferences." />

      <Tabs defaultValue="profile">
        <TabsList className="h-auto max-w-full justify-start overflow-x-auto">
          {([
            ["profile", UserRound],
            ["wallet", Wallet],
            ["notifications", Bell],
            ["security", Lock],
            ["appearance", Sun],
          ] as [string, typeof Sun][]).map(([v, I]) => (
            <TabsTrigger key={v} value={v} className="capitalize">
              <I className="size-4" />
              {v}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="panel mt-4 space-y-4">
          <h2 className="section-title">Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Display name</Label>
              <Input id="name" defaultValue={displayName} className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue={email ?? ""} readOnly className="mt-1.5 cursor-default opacity-70" />
            </div>
          </div>
          <Button onClick={() => toast.success("Profile saved")}>Save changes</Button>
        </TabsContent>

        <TabsContent value="wallet" className="panel mt-4">
          <h2 className="section-title">Connected wallet</h2>
          <div className="detail-list mt-4">
            <div>
              <span>Address</span>
              <strong>{walletAddress ? shorten(walletAddress) : "No wallet"}</strong>
            </div>
            <div><span>Network</span><strong>Monad Testnet</strong></div>
            <div><span>Type</span><strong>Privy Embedded</strong></div>
            <div><span>Status</span><strong className="text-primary">Connected</strong></div>
          </div>
          {walletAddress && (
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => {
                navigator.clipboard?.writeText(walletAddress);
                toast.success("Address copied");
              }}
            >
              Copy full address
            </Button>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="panel mt-4">
          <h2 className="section-title">Notifications</h2>
          {["Invoice paid", "Invoice overdue", "Incoming payment", "Transaction confirmed"].map((x) => (
            <SettingRow key={x} label={x} />
          ))}
        </TabsContent>

        <TabsContent value="security" className="panel mt-4">
          <h2 className="section-title">Security</h2>
          <SettingRow label="Require transaction confirmation" />
          <div className="detail-list mt-4">
            <div><span>Session status</span><strong>Active</strong></div>
            <div><span>Auth provider</span><strong>Privy</strong></div>
            <div><span>Wallet recovery</span><strong>Privy escrow</strong></div>
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="panel mt-4">
          <h2 className="section-title">Appearance</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {([["light", Sun], ["dark", Moon], ["system", Monitor]] as [Theme, typeof Sun][]).map(
              ([v, I]) => (
                <Button
                  key={v}
                  variant={theme === v ? "default" : "outline"}
                  className="h-24 flex-col capitalize"
                  onClick={() => setTheme(v)}
                >
                  <I className="size-5" />
                  {v}
                </Button>
              ),
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
