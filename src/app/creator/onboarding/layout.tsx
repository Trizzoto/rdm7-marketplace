import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Creator",
  description: "Set up payouts and start selling your RDM-7 dashboard layouts and DBC files.",
  robots: { index: false, follow: false },
};

export default function CreatorOnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
