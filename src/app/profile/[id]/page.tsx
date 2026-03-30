"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Layout, Profile } from "@/lib/supabase";
import { LayoutCard } from "@/components/LayoutCard";

export default function ProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"layout" | "dbc">("layout");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchProfileData();
  }, [id]);

  const fetchProfileData = async () => {
    setLoading(true);
    const [{ data: profileData }, { data: layoutsData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase
        .from("layouts")
        .select("*, profiles(display_name, avatar_url)")
        .eq("author_id", id)
        .eq("is_published", true)
        .order("downloads", { ascending: false }),
    ]);

    if (!profileData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setProfile(profileData as Profile);
    setLayouts((layoutsData as Layout[]) || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-32">
        <h1 className="font-heading text-3xl font-bold uppercase mb-3">Profile Not Found</h1>
        <p className="text-[var(--text-muted)]">This user does not exist.</p>
      </div>
    );
  }

  if (!profile) return null;

  const totalDownloads = layouts.reduce((sum, x) => sum + x.downloads, 0);
  const ratedLayouts = layouts.filter((l) => l.rating > 0);
  const avgRating = ratedLayouts.length > 0
    ? ratedLayouts.reduce((sum, l) => sum + l.rating, 0) / ratedLayouts.length
    : 0;
  const isOwnProfile = currentUserId === id;

  const filteredLayouts = layouts.filter((l) => l.item_type === activeTab);
  const layoutCount = layouts.filter((l) => l.item_type === "layout").length;
  const dbcCount = layouts.filter((l) => l.item_type === "dbc").length;

  const joinDate = new Date(profile.created_at).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
  });

  return (
    <div>
      {/* Profile Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-24 h-24 rounded-full object-cover border-2 border-[var(--border)]"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[var(--bg)] border-2 border-[var(--border)] flex items-center justify-center text-4xl font-heading font-bold text-[var(--text-muted)]">
              {profile.display_name[0]?.toUpperCase()}
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-heading text-3xl font-bold uppercase">{profile.display_name}</h1>
              {isOwnProfile && (
                <Link
                  href="/settings"
                  className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] border border-[var(--accent)] px-3 py-1 rounded-md transition-colors"
                >
                  Edit Profile
                </Link>
              )}
            </div>
            {profile.bio && (
              <p className="text-sm text-[var(--text-muted)] mb-2 max-w-xl">{profile.bio}</p>
            )}
            <p className="text-xs text-[var(--text-muted)]">
              Joined {joinDate}
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[var(--border)]">
          <div className="text-center">
            <p className="text-2xl font-heading font-bold">{layouts.length}</p>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Total Items</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-heading font-bold">{totalDownloads.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Downloads</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-heading font-bold">
              {avgRating > 0 ? avgRating.toFixed(1) : "--"}
            </p>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Avg Rating</p>
          </div>
        </div>
      </div>

      {/* Tab Filter */}
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setActiveTab("layout")}
          className={`px-5 py-2.5 text-sm font-heading font-bold uppercase tracking-wide rounded-md transition-colors ${
            activeTab === "layout"
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          Layouts ({layoutCount})
        </button>
        <button
          onClick={() => setActiveTab("dbc")}
          className={`px-5 py-2.5 text-sm font-heading font-bold uppercase tracking-wide rounded-md transition-colors ${
            activeTab === "dbc"
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          DBC Files ({dbcCount})
        </button>
      </div>

      {/* Items Grid */}
      {filteredLayouts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLayouts.map((layout) => (
            <LayoutCard key={layout.id} layout={layout} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <p className="text-sm">
            No {activeTab === "dbc" ? "DBC files" : "layouts"} published yet.
          </p>
        </div>
      )}
    </div>
  );
}
