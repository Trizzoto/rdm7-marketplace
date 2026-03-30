"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-[68px]">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/rdm-logo.png" alt="RDM" width={80} height={32} className="h-8 w-auto" />
            <span className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] hidden sm:inline">Marketplace</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6">
            <Link href="/browse?type=layout" className="relative text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[var(--accent)] hover:after:w-full after:transition-all after:duration-300">
              Layouts
            </Link>
            <Link href="/browse?type=dbc" className="relative text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[var(--accent)] hover:after:w-full after:transition-all after:duration-300">
              DBC Files
            </Link>
            <Link href="https://www.rdm7.com.au" target="_blank" className="relative text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[var(--accent)] hover:after:w-full after:transition-all after:duration-300">
              Shop
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/dashboard" className="relative text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[var(--accent)] hover:after:w-full after:transition-all after:duration-300">
                Dashboard
              </Link>
              <Link href="/settings" className="relative text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[var(--accent)] hover:after:w-full after:transition-all after:duration-300">
                Settings
              </Link>
              <button onClick={handleLogout} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={handleLogin}
              className="bg-[var(--accent)] text-white font-heading text-sm font-bold uppercase tracking-wider px-6 py-2.5 rounded-md hover:bg-[var(--accent-hover)] transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
