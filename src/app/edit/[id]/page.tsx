"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/ImageUploader";
import MarkdownToolbar from "@/components/MarkdownToolbar";
import TagInput from "@/components/TagInput";
import { clearCache } from "@/lib/cache";

interface Photo {
  data: string;
  name: string;
}

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((post) => {
        setTitle(post.title);
        setDescription(post.description);
        setDate(post.date);
        setPhotos(post.photos || []);
        setTags(post.tags || []);
        setIsPrivate(post.is_private || false);
        setLoading(false);
      })
      .catch(() => {
        setError("post not found");
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("title and description are required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          photos,
          tags,
          is_private: isPrivate,
          date,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "failed to update post");
        setSubmitting(false);
        return;
      }

      clearCache();
      router.push(isPrivate ? "/private" : "/");
    } catch {
      setError("something went wrong");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-neutral-400 py-20 text-center">loading...</p>;
  }

  if (error && !title) {
    return <p className="text-sm text-red-500 py-20 text-center">{error}</p>;
  }

  return (
    <div>
      <h1 className="text-sm text-neutral-500 mb-6">edit post</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-black dark:focus:border-white transition-colors"
        />

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="title"
          className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors placeholder:text-neutral-400"
        />

        <div>
          <MarkdownToolbar textareaRef={textareaRef} onUpdate={setDescription} />
          <textarea
            ref={textareaRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="write something... (supports markdown)"
            rows={8}
            className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-black dark:focus:border-white transition-colors placeholder:text-neutral-400 resize-y font-mono"
          />
        </div>

        <ImageUploader photos={photos} setPhotos={setPhotos} />
        <TagInput tags={tags} setTags={setTags} />

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              isPrivate
                ? "bg-black dark:bg-white"
                : "bg-neutral-300 dark:bg-neutral-700"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                isPrivate
                  ? "left-[22px] bg-white dark:bg-black"
                  : "left-0.5 bg-white dark:bg-black"
              }`}
            />
          </button>
          <span className="text-sm text-neutral-500">
            {isPrivate ? "private (encrypted)" : "public"}
          </span>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 text-sm border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors disabled:opacity-50"
        >
          {submitting ? "saving..." : "save changes"}
        </button>
      </form>
    </div>
  );
}
