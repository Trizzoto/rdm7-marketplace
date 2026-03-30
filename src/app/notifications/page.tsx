"use client";

import { useState } from "react";

type NotificationType = "download" | "rating" | "payment" | "system";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// Mock data — will be replaced with Supabase realtime later
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "download",
    title: "Layout Downloaded",
    message: 'Your layout "MaxxECU Street Dash" was downloaded by a user.',
    read: false,
    createdAt: "2026-03-30T08:15:00Z",
  },
  {
    id: "2",
    type: "rating",
    title: "New Rating",
    message: 'Someone rated your layout "Haltech Pro Gauge Set" 5 stars!',
    read: false,
    createdAt: "2026-03-29T16:42:00Z",
  },
  {
    id: "3",
    type: "payment",
    title: "Payment Received",
    message: 'You received $4.50 for a sale of "MoTeC Race Dash".',
    read: false,
    createdAt: "2026-03-29T10:30:00Z",
  },
  {
    id: "4",
    type: "system",
    title: "Welcome to RDM-7 Marketplace",
    message: "Your account is set up. Start uploading layouts or browsing the marketplace!",
    read: true,
    createdAt: "2026-03-28T09:00:00Z",
  },
  {
    id: "5",
    type: "download",
    title: "Layout Downloaded",
    message: 'Your DBC file "BMW E90 CAN Database" was downloaded.',
    read: true,
    createdAt: "2026-03-27T14:20:00Z",
  },
];

const typeIcons: Record<NotificationType, React.ReactNode> = {
  download: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  rating: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  payment: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  system: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const typeColors: Record<NotificationType, string> = {
  download: "text-blue-500 bg-blue-50",
  rating: "text-yellow-500 bg-yellow-50",
  payment: "text-green-500 bg-green-50",
  system: "text-gray-500 bg-gray-100",
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-black uppercase tracking-wide">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] rounded-card border border-[var(--border)]">
          <svg className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="font-heading text-lg font-bold uppercase">No Notifications</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => markAsRead(notification.id)}
              className={`w-full text-left flex items-start gap-4 p-4 rounded-card border transition-all duration-200 ${
                notification.read
                  ? "bg-[var(--surface)] border-[var(--border)] opacity-70"
                  : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)] shadow-sm"
              }`}
            >
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  typeColors[notification.type]
                }`}
              >
                {typeIcons[notification.type]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${notification.read ? "text-[var(--text-muted)]" : "text-[var(--text)]"}`}>
                    {notification.title}
                  </span>
                  {!notification.read && (
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
                  )}
                </div>
                <p className="text-sm text-[var(--text-muted)] mt-0.5 truncate">
                  {notification.message}
                </p>
              </div>

              {/* Timestamp */}
              <span className="text-xs text-[var(--text-muted)] whitespace-nowrap shrink-0">
                {formatTimeAgo(notification.createdAt)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
