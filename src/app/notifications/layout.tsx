import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Sales, downloads, and reviews on the items you have published.",
  robots: { index: false, follow: false },
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
