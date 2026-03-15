import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Only add CSP and HSTS in production
          ...(!isDev
            ? [
                {
                  key: "Content-Security-Policy",
                  value: [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                    "img-src 'self' data: blob: https://*.walletconnect.com https://api.web3modal.org https://api.web3modal.com",
                    "font-src 'self' https://fonts.gstatic.com https://fonts.reown.com",
                    "connect-src 'self' https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org wss://*.relay.walletconnect.com https://rpc.walletconnect.com https://rpc.walletconnect.org https://api.web3modal.org https://api.web3modal.com https://pulse.walletconnect.org https://eth.merkle.io https://*.reown.com",
                    "frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org https://*.reown.com",
                  ].join("; "),
                },
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
