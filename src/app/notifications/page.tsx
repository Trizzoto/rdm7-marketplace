"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type NotificationType = "download" | "rating" | "sale" | "welcome" | "system";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  download: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  rating: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  sale: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  welcome: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  system: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/* ── Swipeable Notification Row ───────────────────────────── */
function SwipeableNotification({
  notification, onDelete, onRead,
}: {
  notification: Notification;
  onDelete: (id: string) => void;
  onRead: (id: string) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);
  const threshold = 80;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
    swiping.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping.current || !rowRef.current) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx > 10) { swiping.current = false; return; }
    currentX.current = dx;
    rowRef.current.style.transform = `translateX(${Math.max(dx, -140)}px)`;
    rowRef.current.style.transition = 'none';
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!rowRef.current) return;
    swiping.current = false;
    if (currentX.current < -threshold) {
      rowRef.current.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
      rowRef.current.style.transform = 'translateX(-100%)';
      rowRef.current.style.opacity = '0';
      setTimeout(() => onDelete(notification.id), 300);
    } else {
      rowRef.current.style.transition = 'transform 0.2s ease-out';
      rowRef.current.style.transform = 'translateX(0)';
    }
    currentX.current = 0;
  }, [notification.id, onDelete]);

  const handleClick = () => {
    if (Math.abs(currentX.current) > 5) return;
    if (!notification.read) onRead(notification.id);
    if (notification.link) window.location.href = notification.link;
  };

  return (
    <div className="relative overflow-hidden rounded-card">
      {/* Delete background (revealed on swipe) */}
      <div className="absolute inset-0 bg-[var(--accent)] flex items-center justify-end px-6 rounded-card">
        <div className="text-white flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-xs font-heading font-bold uppercase tracking-wider">Delete</span>
        </div>
      </div>

      {/* Swipeable content */}
      <div
        ref={rowRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
        className={`relative z-10 cursor-pointer select-none border transition-colors duration-200 bg-[var(--surface)] border-[var(--border)] rounded-card ${
          !notification.read ? "hover:border-[var(--accent)]" : ""
        }`}
        style={{ willChange: 'transform' }}
      >
        <div className="flex items-center gap-3 p-4">
          {/* Icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            !notification.read
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--bg)] text-[var(--text-muted)]"
          }`}>
            {typeIcons[notification.type] || typeIcons.system}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${
                notification.read
                  ? "font-medium text-[var(--text-muted)]"
                  : "font-bold text-[var(--text)]"
              }`}>
                {notification.title}
              </span>
              {!notification.read && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
              {notification.message}
            </p>
          </div>

          {/* Time + delete */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
              {formatTimeAgo(notification.created_at)}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
              className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors hidden sm:block"
              title="Delete"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────── */
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchNotifications();
      } else {
        setLoading(false);
      }
    });
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = async () => {
    if (!userId) return;
    await supabase.from("notifications").delete().neq("id", "");
    setNotifications([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-[var(--text-muted)]">Sign in to view your notifications.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold uppercase">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {unreadCount} unread
            </p>
          )}
        </div>
        <div className="flex gap-4">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-heading font-bold uppercase tracking-wider text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs font-heading font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Swipe hint (mobile) */}
      <p className="text-xs text-[var(--text-muted)] mb-4 sm:hidden">
        Swipe left to delete
      </p>

      {/* Notifications */}
      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] rounded-card border border-[var(--border)]">
          <svg className="w-10 h-10 mx-auto mb-3 text-[var(--border)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="font-heading text-lg font-bold uppercase text-[var(--text-muted)]">All Clear</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <SwipeableNotification
              key={n.id}
              notification={n}
              onDelete={deleteNotification}
              onRead={markAsRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
