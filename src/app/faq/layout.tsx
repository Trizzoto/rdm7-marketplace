import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about downloading, installing, publishing, and selling RDM-7 dashboard layouts and DBC files.",
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
