"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/ImageUploader";
import WalletConnect from "@/components/WalletConnect";
import { clearCache } from "@/lib/cache";

interface Photo {
  data: string;
  name: string;
}

export default function WritePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((d) => {
        setAuthenticated(d.authenticated);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("title and description are required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          photos,
          is_private: isPrivate,
          date,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "failed to create post");
        setSubmitting(false);
        return;
      }

      // Clear relevant cache so listing pages fetch fresh data
      clearCache();
      router.push(isPrivate ? "/private" : "/");
    } catch {
      setError("something went wrong");
      setSubmitting(false);
    }
  };

  if (checking) {
    return <p className="text-sm text-neutral-400 py-20 text-center">checking auth...</p>;
  }

  if (!authenticated) {
    return (
      <div>
        <h1 className="text-sm text-neutral-500 mb-6">new post</h1>
        <WalletConnect onAuthenticated={() => setAuthenticated(true)} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-sm text-neutral-500 mb-6">new post</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-black dark:focus:border-white transition-colors"
          />
        </div>

        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="title"
            className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors placeholder:text-neutral-400"
          />
        </div>

        <div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="write something..."
            rows={8}
            className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-black dark:focus:border-white transition-colors placeholder:text-neutral-400 resize-y"
          />
        </div>

        <ImageUploader photos={photos} setPhotos={setPhotos} />

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
          {submitting ? "publishing..." : "publish"}
        </button>
      </form>
    </div>
  );
}
