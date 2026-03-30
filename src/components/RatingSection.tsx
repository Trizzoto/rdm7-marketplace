"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Rating = { id: string; score: number; comment: string | null; created_at: string; profiles?: { display_name: string } };

export function RatingSection({ layoutId }: { layoutId: string }) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    supabase
      .from("ratings")
      .select("*, profiles(display_name)")
      .eq("layout_id", layoutId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setRatings((data as Rating[]) || []));
  }, [layoutId]);

  const submit = async () => {
    if (!userId || myScore === 0) return;
    setSubmitting(true);
    await supabase.from("ratings").upsert({
      layout_id: layoutId,
      user_id: userId,
      score: myScore,
      comment: myComment || null,
    });
    setSubmitting(false);
    // Refresh
    const { data } = await supabase
      .from("ratings")
      .select("*, profiles(display_name)")
      .eq("layout_id", layoutId)
      .order("created_at", { ascending: false })
      .limit(20);
    setRatings((data as Rating[]) || []);
    setMyComment("");
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Ratings & Reviews</h2>

      {/* Submit Rating */}
      {userId && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 mb-4">
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setMyScore(s)}
                className={`text-xl ${s <= myScore ? "text-yellow-400" : "text-[var(--border)]"} hover:text-yellow-300`}
              >
                &#9733;
              </button>
            ))}
          </div>
          <textarea
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            placeholder="Leave a comment (optional)"
            rows={2}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] mb-2 resize-none focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
          />
          <button
            onClick={submit}
            disabled={myScore === 0 || submitting}
            className="bg-[var(--accent)] text-white text-sm font-semibold px-4 py-1.5 rounded-md hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      )}

      {/* Reviews List */}
      {ratings.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No reviews yet.</p>
      ) : (
        <div className="space-y-3">
          {ratings.map((r) => (
            <div key={r.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-yellow-400 text-sm">{"&#9733;".repeat(r.score)}</span>
                <span className="text-xs text-[var(--text-muted)]">{r.profiles?.display_name || "Anonymous"}</span>
              </div>
              {r.comment && <p className="text-sm text-[var(--text-muted)]">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
