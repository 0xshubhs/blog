"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDisconnect } from "wagmi";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const { disconnect } = useDisconnect();

  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((d) => setAuthenticated(d.authenticated))
      .catch(() => {});
  }, []);

  const handleDisconnect = async () => {
    // Clear server session
    await fetch("/api/auth/logout", { method: "POST" });
    // Disconnect wallet from WalletConnect
    disconnect();
    setAuthenticated(false);
    // Redirect to public page immediately
    router.push("/");
    router.refresh();
  };

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="text-lg tracking-tight font-medium hover:opacity-60 transition-opacity">
          blog
        </Link>
        <nav className="flex items-center gap-6 text-sm">
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
          {authenticated && (
            <button
              onClick={handleDisconnect}
              className="px-2.5 py-1 text-xs border border-neutral-300 dark:border-neutral-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            >
              disconnect
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
