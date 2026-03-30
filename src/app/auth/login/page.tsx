"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleGoogle = async () => {
    setError("");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (!displayName.trim()) throw new Error("Display name is required");
      if (password.length < 6) throw new Error("Password must be at least 6 characters");

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;

      // Create profile immediately if user is confirmed (no email verification)
      if (data.user && !data.user.identities?.length) {
        throw new Error("An account with this email already exists");
      }

      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          display_name: displayName.trim(),
        });
      }

      if (data.session) {
        // Auto-confirmed — go to dashboard
        router.push("/dashboard");
      } else {
        // Email confirmation required
        setMessage("Check your email for a confirmation link!");
        setEmail("");
        setPassword("");
        setDisplayName("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/rdm-logo.png" alt="RDM" width={120} height={48} className="h-12 w-auto mx-auto mb-4" />
          </Link>
          <h1 className="font-heading text-2xl font-bold uppercase">
            {mode === "login" ? "Sign In" : "Create Account"}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {mode === "login" ? "Welcome back to the RDM Marketplace" : "Join the RDM community"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-8">
          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm font-medium text-[var(--text)] hover:border-[var(--text)] transition-colors mb-6"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[var(--surface)] px-3 text-[var(--text-muted)]">or continue with email</span>
            </div>
          </div>

          {/* Error / Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 mb-4">
              {message}
            </div>
          )}

          {/* Email Form */}
          <form onSubmit={mode === "login" ? handleEmailLogin : handleEmailSignup}>
            {mode === "signup" && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="Your name"
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
            )}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder={mode === "signup" ? "Min 6 characters" : "Your password"}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent)] text-white font-heading font-bold text-sm uppercase tracking-wider py-3 rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="text-center text-sm text-[var(--text-muted)] mt-6">
            {mode === "login" ? (
              <>Don&apos;t have an account?{" "}
                <button onClick={() => { setMode("signup"); setError(""); setMessage(""); }} className="text-[var(--accent)] font-medium hover:underline">
                  Sign Up
                </button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} className="text-[var(--accent)] font-medium hover:underline">
                  Sign In
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
