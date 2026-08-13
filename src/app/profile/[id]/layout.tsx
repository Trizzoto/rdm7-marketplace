import type { Metadata } from "next";

// The profile page renders client-side, so the creator's name is not available
// here — keep a stable, descriptive title for the tab and for shared links.
export const metadata: Metadata = {
  title: "Creator Profile",
  description: "Layouts, splash screens, and DBC files published by this RDM-7 Marketplace creator.",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
