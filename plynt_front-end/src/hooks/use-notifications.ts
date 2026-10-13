// src/hooks/use-notifications.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useProfile } from "./use-profile";
import {
  fetchNotifications,
  markRead,
  markAllRead,
  type NotificationRow,
} from "@/services/notificationService";

export type { NotificationRow };

const POLL_INTERVAL_MS = 15_000; // poll every 15 seconds

export function useNotifications() {
  const { profile } = useProfile();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const data = await fetchNotifications(profile.id);
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  // Initial load + start polling
  useEffect(() => {
    if (!profile?.id) return;

    load();

    // Poll every 15s to pick up new notifications (e.g. from the trigger)
    pollRef.current = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [profile?.id, load]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    await markRead(id);
  };

  const handleMarkAllRead = async () => {
    if (!profile?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllRead(profile.id);
  };

  return {
    notifications,
    loading,
    unreadCount,
    reload: load,
    markRead: handleMarkRead,
    markAllRead: handleMarkAllRead,
  } as const;
}
