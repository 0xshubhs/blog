"use client";

import { useEffect, useRef, useState } from "react";

export default function SearchBar({
  onSearch,
}: {
  onSearch: (query: string) => void;
}) {
  const [query, setQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(value);
    }, 300);
  };

  return (
    <input
      type="text"
      value={query}
      onChange={handleChange}
      placeholder="search posts..."
      className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors placeholder:text-neutral-400 font-mono"
    />
  );
}
