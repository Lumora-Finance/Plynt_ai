// src/hooks/use-notifications.ts
import { useCallback, useEffect, useState } from "react";
import { useProfile } from "./use-profile";
import {
  fetchNotifications,
  markRead,
  markAllRead,
  type NotificationRow,
} from "@/services/notificationService";

export type { NotificationRow };

export function useNotifications() {
  const { profile } = useProfile();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

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
