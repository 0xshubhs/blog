"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDisconnect } from "wagmi";
import { clearCache, getCached, setCache } from "@/lib/cache";
import ThemeToggle from "@/components/ThemeToggle";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const { disconnect } = useDisconnect();

  useEffect(() => {
    const cached = getCached<boolean>("auth_status");
    if (cached !== null) {
      setAuthenticated(cached);
      return;
    }
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((d) => {
        setAuthenticated(d.authenticated);
        setCache("auth_status", d.authenticated);
      })
      .catch(() => {});
  }, []);

  const handleDisconnect = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    disconnect();
    setAuthenticated(false);
    clearCache();
    router.push("/");
    router.refresh();
  };

  // Keyboard shortcut: Ctrl+Shift+L to disconnect
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "L" && authenticated) {
        e.preventDefault();
        handleDisconnect();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <header>
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-4 flex flex-col items-center gap-2">
        <Link href="/" className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity">
          <img src="/m.gif" alt="" className="w-14 h-14 rounded-full" />
          <span className="text-xl tracking-tight font-medium">0xshubhs-blogs</span>
        </Link>
      </div>
      <div className="max-w-3xl mx-auto px-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <nav className="flex items-center justify-center gap-6 text-sm">
          <Link
            href="/"
            className={`hover:opacity-60 transition-opacity ${
              pathname === "/" ? "underline underline-offset-4" : ""
            }`}
          >
            public
          </Link>
          <Link
            href="/private"
            className={`hover:opacity-60 transition-opacity ${
              pathname === "/private" ? "underline underline-offset-4" : ""
            }`}
          >
            private
          </Link>
          <Link
            href="/write"
            className={`hover:opacity-60 transition-opacity ${
              pathname === "/write" ? "underline underline-offset-4" : ""
            }`}
          >
            write
          </Link>
          <ThemeToggle />
          {authenticated && (
            <button
              onClick={handleDisconnect}
              className="px-2.5 py-1 text-xs border border-neutral-300 dark:border-neutral-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              title="Ctrl+Shift+L"
            >
              disconnect
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
