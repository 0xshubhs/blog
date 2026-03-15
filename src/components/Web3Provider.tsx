"use client";

import { WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState, useEffect, useRef } from "react";
import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "placeholder";

const metadata = {
  name: "blog",
  description: "personal daily journal",
  url: "https://blog.example.com",
  icons: [],
};

const chains = [mainnet] as const;

const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  ssr: true,
});

const queryClient = new QueryClient();

export default function Web3Provider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      import("@web3modal/wagmi/react").then(({ createWeb3Modal }) => {
        createWeb3Modal({ wagmiConfig: config, projectId });
        setReady(true);
      });
    }
  }, []);

  if (!ready) return null;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
