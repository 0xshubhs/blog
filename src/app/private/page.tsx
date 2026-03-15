"use client";

import { useEffect, useState } from "react";
import PostCard from "@/components/PostCard";
import WalletConnect from "@/components/WalletConnect";

interface Post {
  id: string;
  title: string;
  description: string;
  photos: { data: string; name: string }[];
  date: string;
  is_private?: boolean;
  created_at: string;
}

export default function PrivatePage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((d) => {
        setAuthenticated(d.authenticated);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    fetch(`/api/posts?mode=private&sort=${sort}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPosts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authenticated, sort]);

  const handleDelete = (id: string) => {
    setPosts(posts.filter((p) => p.id !== id));
  };

  if (checking) {
    return (
      <p className="text-sm text-neutral-400 py-20 text-center">checking auth...</p>
    );
  }

  if (!authenticated) {
    return <WalletConnect onAuthenticated={() => setAuthenticated(true)} />;
  }

  return (
    <div>
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
          no private posts yet
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canDelete
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
