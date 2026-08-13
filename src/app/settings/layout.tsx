import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your RDM-7 Marketplace profile, payouts, and account preferences.",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
