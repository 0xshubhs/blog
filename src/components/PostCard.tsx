"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

function readingTime(words: number): string {
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

// Lightweight post from list API
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

// Full post from /api/posts/[id]
interface FullPost {
  description: string;
  photos: { data: string; name: string }[];
}

export default function PostCard({
  post,
  onDelete,
  onPin,
  canDelete,
}: {
  post: PostSummary;
  onDelete?: (id: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [fullPost, setFullPost] = useState<FullPost | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);

    // Lazy-load full content if not already loaded
    if (!fullPost) {
      setLoadingFull(true);
      try {
        const res = await fetch(`/api/posts/${post.id}`);
        if (res.ok) {
          const data = await res.json();
          setFullPost({
            description: data.description,
            photos: data.photos || [],
          });
        }
      } catch {
        // ignore
      }
      setLoadingFull(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this post?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (res.ok && onDelete) onDelete(post.id);
    } catch {
      alert("Failed to delete");
    }
    setDeleting(false);
  };

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !post.pinned }),
      });
      if (res.ok && onPin) onPin(post.id, !post.pinned);
    } catch {
      // ignore
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/edit/${post.id}`);
  };

  return (
    <article
      className="border border-neutral-200 dark:border-neutral-800 p-6 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
      onClick={handleExpand}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <time className="text-xs text-neutral-500 font-mono tabular-nums shrink-0">
              {post.date}
            </time>
            <span className="text-xs text-neutral-400 font-mono">
              {readingTime(post.word_count)}
            </span>
            {post.pinned && (
              <span className="text-xs text-neutral-500">pinned</span>
            )}
            {post.is_private && (
              <span className="text-xs px-1.5 py-0.5 border border-neutral-300 dark:border-neutral-700 text-neutral-500">
                private
              </span>
            )}
          </div>
          <h2 className="text-base font-medium leading-snug">{post.title}</h2>
          {!expanded && (
            <p className="text-sm text-neutral-500 mt-1 line-clamp-2">
              {post.preview}
            </p>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 text-neutral-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {!expanded && post.photo_count > 0 && (
            <span className="text-xs text-neutral-400 mt-1 inline-block font-mono">
              {post.photo_count} photo{post.photo_count > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4" onClick={(e) => e.stopPropagation()}>
          {loadingFull ? (
            <p className="text-sm text-neutral-400 py-4">loading...</p>
          ) : fullPost ? (
            <>
              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
                <ReactMarkdown>{fullPost.description}</ReactMarkdown>
              </div>

              {fullPost.photos.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                    <img
                      src={fullPost.photos[photoIndex].data}
                      alt={fullPost.photos[photoIndex].name}
                      className="w-full max-h-[500px] object-contain bg-neutral-50 dark:bg-neutral-900"
                    />
                  </div>
                  {fullPost.photos.length > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPhotoIndex(Math.max(0, photoIndex - 1))}
                        disabled={photoIndex === 0}
                        className="text-xs px-2 py-1 border border-neutral-300 dark:border-neutral-700 disabled:opacity-30 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        prev
                      </button>
                      <span className="text-xs text-neutral-500 font-mono">
                        {photoIndex + 1}/{fullPost.photos.length}
                      </span>
                      <button
                        onClick={() =>
                          setPhotoIndex(Math.min(fullPost.photos.length - 1, photoIndex + 1))
                        }
                        disabled={photoIndex === fullPost.photos.length - 1}
                        className="text-xs px-2 py-1 border border-neutral-300 dark:border-neutral-700 disabled:opacity-30 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-neutral-400 py-4">failed to load</p>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/post/${post.id}`}
              className="text-xs px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              permalink
            </Link>
          </div>

          {canDelete && (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleEdit}
                className="text-xs px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                edit
              </button>
              <button
                onClick={handlePin}
                className="text-xs px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {post.pinned ? "unpin" : "pin"}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 transition-colors"
              >
                {deleting ? "deleting..." : "delete"}
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
