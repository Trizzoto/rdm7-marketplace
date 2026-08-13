import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search dashboard layouts, splash screens, and DBC files by name, vehicle, ECU, or tag.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
