import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creator Dashboard",
  description: "Manage your published layouts, track downloads, and view your earnings.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
