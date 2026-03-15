"use client";

import { useEffect, useState, useCallback } from "react";
import PostCard from "@/components/PostCard";
import SearchBar from "@/components/SearchBar";
import PostStats from "@/components/PostStats";
import WalletConnect from "@/components/WalletConnect";
import { clearCache } from "@/lib/cache";

interface Post {
  id: string;
  title: string;
  description: string;
  photos: { data: string; name: string }[];
  date: string;
  is_private?: boolean;
  created_at: string;
  tags?: string[];
  pinned?: boolean;
}

export default function PrivatePage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((d) => {
        setAuthenticated(d.authenticated);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  const fetchPosts = useCallback(
    async (p: number, append: boolean) => {
      if (!authenticated) return;
      if (p === 1) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams({
        mode: "private",
        sort,
        page: String(p),
        limit: "20",
      });
      if (search) params.set("search", search);

      try {
        const res = await fetch(`/api/posts?${params}`);
        const data = await res.json();
        if (data.posts) {
          setPosts((prev) => (append ? [...prev, ...data.posts] : data.posts));
          setTotal(data.total);
        }
      } catch {
        // ignore
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [authenticated, sort, search]
  );

  useEffect(() => {
    setPage(1);
    fetchPosts(1, false);
  }, [fetchPosts]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  const handleDelete = (id: string) => {
    setPosts(posts.filter((p) => p.id !== id));
    setTotal((t) => t - 1);
    clearCache();
  };

  const handlePin = (id: string, pinned: boolean) => {
    setPosts(posts.map((p) => (p.id === id ? { ...p, pinned } : p)));
    clearCache();
  };

  if (checking) {
    return (
      <p className="text-sm text-neutral-400 py-20 text-center">checking auth...</p>
    );
  }

  if (!authenticated) {
    return <WalletConnect onAuthenticated={() => setAuthenticated(true)} />;
  }

  const hasMore = posts.length < total;

  return (
    <div>
      <div className="mb-4">
        <SearchBar onSearch={setSearch} />
      </div>

      <PostStats posts={posts} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-sm text-neutral-500">private posts</h1>
        <button
          onClick={() => setSort(sort === "desc" ? "asc" : "desc")}
          className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors font-mono"
        >
          {sort === "desc" ? "newest first" : "oldest first"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400 py-20 text-center">loading...</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-neutral-400 py-20 text-center">
          {search ? "no matching posts" : "no private posts yet"}
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canDelete
              onDelete={handleDelete}
              onPin={handlePin}
            />
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2.5 text-sm text-neutral-500 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors font-mono"
            >
              {loadingMore ? "loading..." : `load more (${posts.length}/${total})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
