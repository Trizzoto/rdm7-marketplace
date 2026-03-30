"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Stub notification count — replace with real Supabase query later
  const notificationCount = 3;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Close "More" dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Ctrl+K shortcut hint — actual focus is handled by SearchBar component
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        // If on search page, the SearchBar handles it.
        // Otherwise navigate to search.
        if (!window.location.pathname.startsWith("/search")) {
          window.location.href = "/search";
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
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

  const navLinkClass =
    "relative text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[var(--accent)] hover:after:w-full after:transition-all after:duration-300";

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-[68px]">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/rdm-logo.png" alt="RDM" width={80} height={32} className="h-8 w-auto" />
            <span className="font-heading text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] hidden sm:inline">
              Marketplace
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-6">
            <Link href="/browse?type=layout" className={navLinkClass}>
              Layouts
            </Link>
            <Link href="/trending" className={navLinkClass}>
              Trending
            </Link>
            <Link href="/new" className={navLinkClass}>
              New
            </Link>

            {/* More dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className={`${navLinkClass} flex items-center gap-1`}
              >
                More
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {moreOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-card shadow-xl py-2 z-50">
                  <Link
                    href="/browse?type=dbc"
                    className="block px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                    onClick={() => setMoreOpen(false)}
                  >
                    DBC Files
                  </Link>
                  <Link
                    href="/collections"
                    className="block px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                    onClick={() => setMoreOpen(false)}
                  >
                    My Favorites
                  </Link>
                  <Link
                    href="https://www.rdm7.com.au"
                    target="_blank"
                    className="block px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                    onClick={() => setMoreOpen(false)}
                  >
                    Shop
                  </Link>
                  <div className="border-t border-[var(--border)] my-1" />
                  <Link
                    href="/changelog"
                    className="block px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                    onClick={() => setMoreOpen(false)}
                  >
                    Changelog
                  </Link>
                  <Link
                    href="/about"
                    className="block px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                    onClick={() => setMoreOpen(false)}
                  >
                    About
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search button */}
          <Link
            href="/search"
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
            aria-label="Search"
            title="Search (Ctrl+K)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>

          {/* Notifications bell (logged in only) */}
          {user && (
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[var(--accent)] text-white text-[10px] font-bold rounded-full px-1">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <>
              <Link href="/dashboard" className={`hidden sm:block ${navLinkClass}`}>
                Dashboard
              </Link>
              <Link href="/settings" className={`hidden sm:block ${navLinkClass}`}>
                Settings
              </Link>
              <button onClick={handleLogout} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors hidden sm:block">
                Sign Out
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                aria-label="Menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="bg-[var(--accent)] text-white font-heading text-sm font-bold uppercase tracking-wider px-6 py-2.5 rounded-md hover:bg-[var(--accent-hover)] transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-[var(--border)] bg-[var(--surface)] px-4 py-4 space-y-3">
          <Link href="/browse?type=layout" className="block text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]" onClick={() => setMobileMenuOpen(false)}>
            Layouts
          </Link>
          <Link href="/trending" className="block text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]" onClick={() => setMobileMenuOpen(false)}>
            Trending
          </Link>
          <Link href="/new" className="block text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]" onClick={() => setMobileMenuOpen(false)}>
            New
          </Link>
          <Link href="/browse?type=dbc" className="block text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]" onClick={() => setMobileMenuOpen(false)}>
            DBC Files
          </Link>
          <Link href="/collections" className="block text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]" onClick={() => setMobileMenuOpen(false)}>
            My Favorites
          </Link>
          <div className="border-t border-[var(--border)] pt-3">
            <Link href="/dashboard" className="block text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]" onClick={() => setMobileMenuOpen(false)}>
              Dashboard
            </Link>
            <Link href="/settings" className="block text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] mt-3" onClick={() => setMobileMenuOpen(false)}>
              Settings
            </Link>
            <button onClick={handleLogout} className="block text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] mt-3">
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
