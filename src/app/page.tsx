"use client";

import { useEffect, useState, useCallback } from "react";
import PostCard from "@/components/PostCard";
import SearchBar from "@/components/SearchBar";
import PostStats from "@/components/PostStats";
import { getCached, setCache, clearCache } from "@/lib/cache";

interface PostSummary {
  id: string;
  title: string;
  preview: string;
  word_count: number;
  photo_count: number;
  date: string;
  is_private?: boolean;
  created_at: string;
  tags?: string[];
  pinned?: boolean;
}

function getInitialPublicData() {
  const cached = getCached<{ posts: PostSummary[]; total: number }>("public_posts");
  return { posts: cached?.posts || [], total: cached?.total || 0, hasCached: cached !== null };
}

export default function HomePage() {
  const [initial] = useState(getInitialPublicData);
  const [posts, setPosts] = useState<PostSummary[]>(initial.posts);
  const [loading, setLoading] = useState(!initial.hasCached);
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [authenticated, setAuthenticated] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initial.total);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const cached = getCached<boolean>("auth_status");
    if (cached !== null) {
      setAuthenticated(cached);
    } else {
      fetch("/api/auth/check")
        .then((r) => r.json())
        .then((d) => {
          setAuthenticated(d.authenticated);
          setCache("auth_status", d.authenticated);
        })
        .catch(() => {});
    }
  }, []);

  const fetchPosts = useCallback(
    async (p: number, append: boolean) => {
      if (p === 1 && !search) {
        const cached = getCached<{ posts: PostSummary[]; total: number }>("public_posts");
        if (cached) {
          setPosts(cached.posts);
          setTotal(cached.total);
          setLoading(false);
          return;
        }
      }

      const hasCached = getCached<{ posts: PostSummary[]; total: number }>("public_posts") !== null;
      if (p === 1 && !hasCached) setLoading(true);
      else if (p > 1) setLoadingMore(true);

      const params = new URLSearchParams({
        mode: "public",
        sort,
        page: String(p),
        limit: "20",
      });
      if (search) params.set("search", search);

      try {
        const res = await fetch(`/api/posts?${params}`);
        const data = await res.json();
        if (data.posts) {
          setPosts((prev) => append ? [...prev, ...data.posts] : data.posts);
          setTotal(data.total);
          if (p === 1 && !search) {
            setCache("public_posts", { posts: data.posts, total: data.total });
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [sort, search]
  );

  useEffect(() => {
    setPage(1);
    fetchPosts(1, false);
  }, [fetchPosts]);

  // Prefetch private posts so switching tabs is instant
  useEffect(() => {
    if (authenticated && !getCached<unknown>("private_posts")) {
      fetch("/api/posts?mode=private&sort=desc&page=1&limit=20")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.posts) setCache("private_posts", { posts: data.posts, total: data.total });
        })
        .catch(() => {});
    }
  }, [authenticated]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  const handleDelete = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setTotal((t) => t - 1);
    clearCache();
  }, []);

  const handlePin = useCallback((id: string, pinned: boolean) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, pinned } : p)));
    clearCache();
  }, []);

  const handleExport = useCallback(async () => {
    const res = await fetch("/api/posts/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blog-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const hasMore = posts.length < total;

  return (
    <div>
      <div className="mb-4">
        <SearchBar onSearch={setSearch} />
      </div>

      <PostStats posts={posts} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-sm text-neutral-500">public posts</h1>
        <div className="flex items-center gap-3">
          {authenticated && (
            <button
              onClick={handleExport}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors font-mono"
            >
              export
            </button>
          )}
          <button
            onClick={() => setSort(sort === "desc" ? "asc" : "desc")}
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors font-mono"
          >
            {sort === "desc" ? "newest first" : "oldest first"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400 py-20 text-center">loading...</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-neutral-400 py-20 text-center">
          {search ? "no matching posts" : "no posts yet"}
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canDelete={authenticated}
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
