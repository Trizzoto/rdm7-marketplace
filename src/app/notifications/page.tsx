"use client";

import { useState, useRef, useCallback } from "react";

type NotificationType = "download" | "rating" | "payment" | "system";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  detail: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1", type: "download", title: "Layout Downloaded",
    message: 'Your layout "MaxxECU Street Dash" was downloaded.',
    detail: 'A user downloaded your "MaxxECU Street Dash" layout. This is your 47th download for this layout. Keep it up — popular layouts get featured on the homepage!',
    read: false, createdAt: "2026-03-31T08:15:00Z", link: "/dashboard",
  },
  {
    id: "2", type: "rating", title: "New 5-Star Rating",
    message: '"Haltech Pro Gauge Set" received a 5-star review.',
    detail: 'A user left a 5-star review on your "Haltech Pro Gauge Set" layout with the comment: "Perfect layout for track days, clean and easy to read at speed." Your average rating is now 4.8 stars.',
    read: false, createdAt: "2026-03-30T16:42:00Z", link: "/dashboard",
  },
  {
    id: "3", type: "payment", title: "Payment Received — $4.50",
    message: 'Sale of "MoTeC Race Dash" — you earned $4.50.',
    detail: 'A buyer purchased your "MoTeC Race Dash" layout for $5.00. After the 15% platform fee ($0.75), you received $4.25. Funds will be deposited to your connected Stripe account within 2 business days.',
    read: false, createdAt: "2026-03-30T10:30:00Z", link: "/dashboard",
  },
  {
    id: "4", type: "system", title: "Welcome to RDM-7 Marketplace",
    message: "Your account is set up and ready to go.",
    detail: "Welcome! You can now browse and download layouts, upload your own designs, and connect your Stripe account to sell premium layouts. Head to your Dashboard to get started.",
    read: true, createdAt: "2026-03-28T09:00:00Z", link: "/dashboard",
  },
  {
    id: "5", type: "download", title: "DBC File Downloaded",
    message: '"BMW E90 CAN Database" was downloaded.',
    detail: 'Your DBC file "BMW E90 CAN Database" was downloaded by a user. This file has been downloaded 23 times total.',
    read: true, createdAt: "2026-03-27T14:20:00Z",
  },
];

const typeIcons: Record<NotificationType, React.ReactNode> = {
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
  payment: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  notification, onDelete, onRead, expanded, onToggleExpand,
}: {
  notification: Notification;
  onDelete: (id: string) => void;
  onRead: (id: string) => void;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
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
    onToggleExpand(notification.id);
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
        className={`relative z-10 cursor-pointer select-none border transition-colors duration-200 bg-[var(--surface)] border-[var(--border)] ${
          !notification.read
            ? "hover:border-[var(--accent)]"
            : ""
        } ${expanded ? "rounded-t-card" : "rounded-card"}`}
        style={{ willChange: 'transform' }}
      >
        <div className="flex items-start gap-3 p-4">
          {/* Icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            !notification.read
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--bg)] text-[var(--text-muted)]"
          }`}>
            {typeIcons[notification.type]}
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

          {/* Time + chevron */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
              {formatTimeAgo(notification.createdAt)}
            </span>
            <svg
              className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      <div
        className={`relative z-10 overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-[var(--surface)] border border-t-0 border-[var(--border)] rounded-b-card px-4 pb-4 pt-2">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            {notification.detail}
          </p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--text-muted)]">
              {new Date(notification.createdAt).toLocaleString()}
            </span>
            <div className="flex gap-3">
              {notification.link && (
                <a
                  href={notification.link}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-heading font-bold uppercase tracking-wider text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  View Details
                </a>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
                className="text-xs font-heading font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────── */
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

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
              onClick={() => setNotifications([])}
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
          <p className="text-sm text-[var(--text-muted)] mt-1">No notifications to show.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <SwipeableNotification
              key={n.id}
              notification={n}
              onDelete={deleteNotification}
              onRead={markAsRead}
              expanded={expandedId === n.id}
              onToggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}
