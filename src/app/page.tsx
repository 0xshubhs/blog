"use client";

import { useEffect, useState } from "react";
import PostCard from "@/components/PostCard";
import { getCached, setCache, clearCache } from "@/lib/cache";

interface Post {
  id: string;
  title: string;
  description: string;
  photos: { data: string; name: string }[];
  date: string;
  is_private?: boolean;
  created_at: string;
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>(() => getCached<Post[]>("public_posts") || []);
  const [loading, setLoading] = useState(!getCached("public_posts"));
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [authenticated, setAuthenticated] = useState(false);

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

  useEffect(() => {
    const cacheKey = `public_posts_${sort}`;
    const cached = getCached<Post[]>(cacheKey);

    if (cached) {
      setPosts(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/posts?mode=public&sort=${sort}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPosts(data);
          setCache(cacheKey, data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sort]);

  const handleDelete = (id: string) => {
    setPosts(posts.filter((p) => p.id !== id));
    clearCache("public_posts_desc");
    clearCache("public_posts_asc");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-sm text-neutral-500">public posts</h1>
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
          no posts yet
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canDelete={authenticated}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
