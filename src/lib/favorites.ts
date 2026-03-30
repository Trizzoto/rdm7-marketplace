const STORAGE_KEY = "rdm7_favorites";

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isFavorite(layoutId: string): boolean {
  return getFavorites().includes(layoutId);
}

export function toggleFavorite(layoutId: string): boolean {
  const favorites = getFavorites();
  const index = favorites.indexOf(layoutId);
  if (index === -1) {
    favorites.push(layoutId);
  } else {
    favorites.splice(index, 1);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  window.dispatchEvent(new CustomEvent("favorites-changed"));
  return index === -1; // returns true if now favorited
}
