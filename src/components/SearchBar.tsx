"use client";

import { useState } from "react";

export default function SearchBar({
  onSearch,
}: {
  onSearch: (query: string) => void;
}) {
  const [query, setQuery] = useState("");

  return (
    <input
      type="text"
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        onSearch(e.target.value);
      }}
      placeholder="search posts..."
      className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors placeholder:text-neutral-400 font-mono"
    />
  );
}
