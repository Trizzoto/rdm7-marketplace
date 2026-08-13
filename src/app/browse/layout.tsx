import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse",
  description:
    "Browse every dashboard layout, splash screen, and DBC file on the RDM-7 Marketplace. Filter by vehicle, ECU, and CAN protocol.",
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
