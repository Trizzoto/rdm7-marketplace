"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const RECENT_KEY = "rdm-recent-searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  const recent = getRecentSearches().filter((s) => s !== term);
  recent.unshift(term);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

interface SearchBarProps {
  mode?: "compact" | "full";
  onSelect?: (query: string) => void;
  value?: string;
  onChange?: (value: string) => void;
  autoFocus?: boolean;
}

export function SearchBar({
  mode = "compact",
  onSelect,
  value: controlledValue,
  onChange: controlledOnChange,
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter();
  const [internalValue, setInternalValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = controlledValue !== undefined ? controlledValue : internalValue;
  const setQuery = controlledOnChange || setInternalValue;

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch autocomplete suggestions (debounced)
  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    const { data } = await supabase
      .from("layouts")
      .select("name")
      .eq("is_published", true)
      .ilike("name", `%${term}%`)
      .limit(5);
    if (data) {
      setSuggestions(data.map((d) => d.name));
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    setHighlightIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const handleSubmit = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    saveRecentSearch(trimmed);
    setRecentSearches(getRecentSearches());
    setShowDropdown(false);

    if (onSelect) {
      onSelect(trimmed);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = dropdownItems;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < items.length) {
        handleSubmit(items[highlightIndex]);
      } else {
        handleSubmit(query);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  // Build dropdown items: suggestions first, then recent searches
  const dropdownItems: string[] = [];
  if (query.length >= 2 && suggestions.length > 0) {
    suggestions.forEach((s) => {
      if (!dropdownItems.includes(s)) dropdownItems.push(s);
    });
  }
  if (query.length < 2 && recentSearches.length > 0) {
    recentSearches.forEach((s) => {
      if (!dropdownItems.includes(s)) dropdownItems.push(s);
    });
  }

  const isCompact = mode === "compact";

  return (
    <div ref={containerRef} className={`relative ${isCompact ? "w-full max-w-xs" : "w-full"}`}>
      <div className="relative">
        {/* Search icon */}
        <svg
          className={`absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none ${
            isCompact ? "w-4 h-4" : "w-5 h-5"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          placeholder={isCompact ? "Search..." : "Search layouts, DBC files, ECU types..."}
          className={`w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors ${
            isCompact
              ? "pl-9 pr-16 py-2 text-sm rounded-lg"
              : "pl-12 pr-20 py-3.5 text-base rounded-card"
          }`}
        />

        {/* Ctrl+K badge */}
        <div
          className={`absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] text-[var(--text-muted)] pointer-events-none ${
            isCompact ? "" : "text-xs"
          }`}
        >
          <kbd className="bg-[var(--bg)] border border-[var(--border)] rounded px-1.5 py-0.5 font-mono">Ctrl</kbd>
          <span>+</span>
          <kbd className="bg-[var(--bg)] border border-[var(--border)] rounded px-1.5 py-0.5 font-mono">K</kbd>
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && dropdownItems.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-card shadow-lg overflow-hidden z-50">
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Recent Searches
            </div>
          )}
          {dropdownItems.map((item, i) => (
            <button
              key={item}
              onClick={() => handleSubmit(item)}
              className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                i === highlightIndex
                  ? "bg-[var(--accent-light)] text-[var(--accent)]"
                  : "text-[var(--text)] hover:bg-[var(--bg)]"
              }`}
            >
              <svg className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {query.length < 2 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                )}
              </svg>
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
