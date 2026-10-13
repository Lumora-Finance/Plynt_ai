// src/services/notificationService.ts
import { supabase, type NotificationRow } from "@/lib/supabase";

export type { NotificationRow };

/** Fetch all notifications for a profile, newest first */
export async function fetchNotifications(profileId: string): Promise<NotificationRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[notificationService] fetchNotifications:", error.message);
    return [];
  }
  return data ?? [];
}

/** Mark a single notification as read */
export async function markRead(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) console.error("[notificationService] markRead:", error.message);
}

/** Mark all notifications for a profile as read */
export async function markAllRead(profileId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("profile_id", profileId)
    .eq("read", false);
  if (error) console.error("[notificationService] markAllRead:", error.message);
}

/** Insert a new notification */
export async function createNotification(
  profileId: string,
  title: string,
  body: string,
  type: NotificationRow["type"] = "info",
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("notifications")
    .insert({ profile_id: profileId, title, body, type });
  if (error) console.error("[notificationService] createNotification:", error.message);
}
