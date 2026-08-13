import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Curated collections of RDM-7 dashboard layouts and DBC files, plus the items you have favourited.",
};

export default function CollectionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
