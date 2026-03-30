"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = "/";
        return;
      }
      setUser(data.user);
      fetchProfile(data.user.id);
    });
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      const p = data as Profile;
      setProfile(p);
      setDisplayName(p.display_name || "");
      setBio(p.bio || "");
      setAvatarUrl(p.avatar_url);
    }
    setLoading(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      let newAvatarUrl = avatarUrl;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "png";
        const path = `${user.id}/avatar_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("screenshots")
          .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("screenshots").getPublicUrl(path);
        newAvatarUrl = urlData.publicUrl;
      }

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || "Anonymous",
          bio: bio.trim() || null,
          avatar_url: newAvatarUrl,
        })
        .eq("id", user.id);

      if (dbErr) throw dbErr;

      setAvatarUrl(newAvatarUrl);
      setAvatarFile(null);
      setAvatarPreview(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError("Failed to save: " + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const currentAvatar = avatarPreview || avatarUrl;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-heading text-3xl font-bold uppercase mb-8">Settings</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-card p-4 mb-6">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-card p-4 mb-6">
          Profile saved successfully.
        </div>
      )}

      {/* Profile Section */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6 mb-6">
        <h2 className="font-heading text-lg font-bold uppercase mb-5">Profile</h2>

        {/* Avatar */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            {currentAvatar ? (
              <img src={currentAvatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-[var(--border)]" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[var(--bg)] border-2 border-[var(--border)] flex items-center justify-center text-3xl font-heading font-bold text-[var(--text-muted)]">
                {displayName[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              Change Avatar
            </button>
            <p className="text-xs text-[var(--text-muted)] mt-1">JPG or PNG, max 2MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Display Name */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
            placeholder="Your display name"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={300}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text)] resize-none focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
            placeholder="Tell others about yourself..."
          />
          <p className="text-xs text-[var(--text-muted)] mt-1 text-right">{bio.length}/300</p>
        </div>
      </section>

      {/* Account Section */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6 mb-6">
        <h2 className="font-heading text-lg font-bold uppercase mb-5">Account</h2>

        <div className="mb-5">
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">
            Email
          </label>
          <div className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-muted)]">
            {user.email}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">Managed by your Google account</p>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">
            User ID
          </label>
          <div className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-muted)] font-mono text-xs">
            {user.id}
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
        >
          Sign Out
        </button>
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[var(--accent)] text-white font-heading text-sm font-bold uppercase tracking-wider px-8 py-3 rounded-md hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
