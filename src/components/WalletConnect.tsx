"use client";

import { useState } from "react";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useEffect } from "react";

export default function WalletConnect({
  onAuthenticated,
}: {
  onAuthenticated: () => void;
}) {
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const { address, isConnected } = useAccount();
  const { open } = useWeb3Modal();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (isConnected && address && !verifying) {
      verifyWallet(address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  const verifyWallet = async (addr: string) => {
    setVerifying(true);
    setError("");

    try {
      const message = `Sign this message to authenticate with the blog.\n\nWallet: ${addr}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });

      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed");
        disconnect();
        setVerifying(false);
        return;
      }

      onAuthenticated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      if (!message.includes("User rejected")) {
        setError(message);
      }
      disconnect();
    }
    setVerifying(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 py-20">
      <p className="text-sm text-neutral-500 mb-2">
        connect your wallet to access private posts
      </p>
      <button
        onClick={() => open()}
        disabled={verifying}
        className="px-6 py-2.5 border border-black dark:border-white text-sm hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors disabled:opacity-50"
      >
        {verifying ? "verifying..." : "connect wallet"}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400 max-w-md text-center">{error}</p>}
    </div>
  );
}
