"use client";

import { useEffect, useState } from "react";
import { isFavorite, toggleFavorite } from "@/lib/favorites";

export function FavoriteButton({
  layoutId,
  size = "md",
}: {
  layoutId: string;
  size?: "sm" | "md" | "lg";
}) {
  const [favorited, setFavorited] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setFavorited(isFavorite(layoutId));

    const handler = () => setFavorited(isFavorite(layoutId));
    window.addEventListener("favorites-changed", handler);
    return () => window.removeEventListener("favorites-changed", handler);
  }, [layoutId]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowFavorited = toggleFavorite(layoutId);
    setFavorited(nowFavorited);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
  };

  const sizeMap = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const iconSizeMap = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <button
      onClick={handleClick}
      className={`${sizeMap[size]} flex items-center justify-center rounded-full transition-all duration-200 ${
        favorited
          ? "bg-[#CC0000]/10 text-[#CC0000]"
          : "bg-black/40 text-white/70 hover:text-white hover:bg-black/60"
      } ${animating ? "scale-125" : "scale-100"}`}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      {favorited ? (
        <svg
          className={iconSizeMap[size]}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
      ) : (
        <svg
          className={iconSizeMap[size]}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
        </svg>
      )}
    </button>
  );
}
