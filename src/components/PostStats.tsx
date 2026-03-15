"use client";

interface Post {
  description: string;
  date: string;
}

export default function PostStats({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  const totalWords = posts.reduce((sum, p) => {
    return sum + (p.description?.split(/\s+/).filter(Boolean).length || 0);
  }, 0);

  // Calculate streak (consecutive days with posts, counting backwards from most recent)
  const dates = [...new Set(posts.map((p) => p.date))].sort().reverse();
  let streak = 0;
  if (dates.length > 0) {
    const today = new Date().toISOString().split("T")[0];
    const mostRecent = dates[0];
    // Only count streak if most recent post is today or yesterday
    const diffMs = new Date(today).getTime() - new Date(mostRecent).getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays <= 1) {
      streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const gap = (prev.getTime() - curr.getTime()) / 86400000;
        if (gap <= 1) streak++;
        else break;
      }
    }
  }

  return (
    <div className="flex items-center gap-4 text-xs text-neutral-400 font-mono mb-4">
      <span>{posts.length} posts</span>
      <span>{totalWords.toLocaleString()} words</span>
      {streak > 0 && <span>{streak}d streak</span>}
    </div>
  );
}
