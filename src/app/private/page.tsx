"use client";

import { useEffect, useState, useCallback } from "react";
import PostCard from "@/components/PostCard";
import SearchBar from "@/components/SearchBar";
import PostStats from "@/components/PostStats";
import WalletConnect from "@/components/WalletConnect";
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

function getInitialPrivateData() {
  const cached = getCached<{ posts: PostSummary[]; total: number }>("private_posts");
  return { posts: cached?.posts || [], total: cached?.total || 0, hasCached: cached !== null };
}

export default function PrivatePage() {
  const [initial] = useState(getInitialPrivateData);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<PostSummary[]>(initial.posts);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initial.total);
  const [loadingMore, setLoadingMore] = useState(false);

  // Skip separate auth check — just try fetching posts directly, handle 401 inline
  const fetchPosts = useCallback(
    async (p: number, append: boolean) => {
      if (p === 1 && !search) {
        const cached = getCached<{ posts: PostSummary[]; total: number }>("private_posts");
        if (cached) {
          setPosts(cached.posts);
          setTotal(cached.total);
          setLoading(false);
          return;
        }
      }

      const hasCached = getCached<{ posts: PostSummary[]; total: number }>("private_posts") !== null;
      if (p === 1 && !hasCached) setLoading(true);
      else if (p > 1) setLoadingMore(true);

      const params = new URLSearchParams({
        mode: "private",
        sort,
        page: String(p),
        limit: "20",
      });
      if (search) params.set("search", search);

      try {
        const res = await fetch(`/api/posts?${params}`);
        if (res.status === 401) {
          setAuthenticated(false);
          setLoading(false);
          setLoadingMore(false);
          return;
        }
        const data = await res.json();
        if (data.posts) {
          setPosts((prev) => append ? [...prev, ...data.posts] : data.posts);
          setTotal(data.total);
          setAuthenticated(true);
          if (p === 1 && !search) {
            setCache("private_posts", { posts: data.posts, total: data.total });
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

  if (authenticated === null && posts.length === 0) {
    return (
      <p className="text-sm text-neutral-400 py-20 text-center">loading...</p>
    );
  }

  if (authenticated === false) {
    return <WalletConnect onAuthenticated={() => { setAuthenticated(true); fetchPosts(1, false); }} />;
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
