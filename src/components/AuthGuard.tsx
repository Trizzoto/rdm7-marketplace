"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-10 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-[var(--bg)] flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[var(--text-muted)]">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="font-heading text-xl font-bold uppercase mb-2">Sign In to Continue</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            You need to be signed in to access this page.
          </p>
          <Link
            href="/auth/login"
            className="block w-full bg-[var(--accent)] text-white font-heading text-sm font-bold uppercase tracking-wider px-6 py-3 rounded-md hover:bg-[var(--accent-hover)] transition-colors text-center"
          >
            Sign In / Sign Up
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
