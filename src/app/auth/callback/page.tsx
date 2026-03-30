"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Ensure profile exists
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .single();

        if (!profile) {
          await supabase.from("profiles").insert({
            id: session.user.id,
            display_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
            avatar_url: session.user.user_metadata?.avatar_url || null,
          });
        }
        router.push("/dashboard");
      } else {
        router.push("/");
      }
    };
    handleCallback();
  }, [router]);

  return (
    <div className="text-center py-20 text-[var(--text-muted)]">
      Signing you in...
    </div>
  );
}
