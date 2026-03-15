"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface Post {
  id: string;
  title: string;
  description: string;
  photos: { data: string; name: string }[];
  date: string;
  is_private?: boolean;
  tags?: string[];
}

function readingTime(text: string): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

export default function PostPageClient({ post }: { post: Post }) {
  const [photoIndex, setPhotoIndex] = useState(0);

  return (
    <div>
      <Link
        href={post.is_private ? "/private" : "/"}
        className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors font-mono"
      >
        &larr; back
      </Link>

      <article className="mt-6">
        <div className="flex items-center gap-3 mb-3">
          <time className="text-xs text-neutral-500 font-mono tabular-nums">
            {post.date}
          </time>
          <span className="text-xs text-neutral-400 font-mono">
            {readingTime(post.description)}
          </span>
          {post.is_private && (
            <span className="text-xs px-1.5 py-0.5 border border-neutral-300 dark:border-neutral-700 text-neutral-500">
              private
            </span>
          )}
        </div>

        <h1 className="text-2xl font-semibold leading-tight mb-6">
          {post.title}
        </h1>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
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

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <ReactMarkdown>{post.description}</ReactMarkdown>
        </div>

        {post.photos?.length > 0 && (
          <div className="mt-8 space-y-3">
            <div className="border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <img
                src={post.photos[photoIndex].data}
                alt={post.photos[photoIndex].name}
                className="w-full max-h-[600px] object-contain bg-neutral-50 dark:bg-neutral-900"
              />
            </div>
            {post.photos.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPhotoIndex(Math.max(0, photoIndex - 1))}
                  disabled={photoIndex === 0}
                  className="text-xs px-2 py-1 border border-neutral-300 dark:border-neutral-700 disabled:opacity-30 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  prev
                </button>
                <span className="text-xs text-neutral-500 font-mono">
                  {photoIndex + 1}/{post.photos.length}
                </span>
                <button
                  onClick={() =>
                    setPhotoIndex(Math.min(post.photos.length - 1, photoIndex + 1))
                  }
                  disabled={photoIndex === post.photos.length - 1}
                  className="text-xs px-2 py-1 border border-neutral-300 dark:border-neutral-700 disabled:opacity-30 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  next
                </button>
              </div>
            )}
          </div>
        )}
      </article>
    </div>
  );
}
