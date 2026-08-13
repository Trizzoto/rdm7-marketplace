import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const siteName = "RDM-7 Marketplace";
const siteTitle = "RDM-7 Marketplace | Dashboard Layouts & DBC Files";
const siteDescription =
  "The community marketplace for the RDM-7 digital dash. Browse, download, and share custom dashboard layouts, splash screens, and DBC files — free and paid, ready to install.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "RDM-7", "digital dash", "dashboard layouts", "DBC files",
    "CAN bus", "gauge cluster", "motorsport dash",
  ],
  openGraph: {
    type: "website",
    siteName,
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    images: [{ url: "/rdm-icon-512.png", width: 512, height: 512, alt: siteName }],
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
    images: ["/rdm-icon-512.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col">
        <ToastProvider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
            {children}
          </main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
