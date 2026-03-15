import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Web3Provider from "@/components/Web3Provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://0xshubhs.com";
const siteName = "0xshubhs-blogs";
const siteDescription =
  "thoughts, builds, and notes from a web3 builder. on-chain identity, decentralized systems, and everything in between.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — blog`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "web3",
    "blockchain",
    "ethereum",
    "developer blog",
    "0xshubh",
    "crypto",
    "decentralized",
    "solidity",
    "smart contracts",
    "personal blog",
  ],
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  icons: {
    icon: "/m.gif",
    shortcut: "/m.gif",
    apple: "/m.gif",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    title: `${siteName} — blog`,
    description: siteDescription,
    images: [
      {
        url: "/m.gif",
        width: 512,
        height: 512,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${siteName} — blog`,
    description: siteDescription,
    images: ["/m.gif"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/m.gif" type="image/gif" />
        <link rel="apple-touch-icon" href="/m.gif" />
        <meta name="theme-color" content="#0a0a0a" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark')}if(t==='light'){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Blog",
              name: siteName,
              description: siteDescription,
              url: siteUrl,
              author: {
                "@type": "Person",
                name: siteName,
                url: siteUrl,
              },
              image: `${siteUrl}/m.gif`,
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Web3Provider>
          <Header />
          <main className="max-w-3xl mx-auto px-6 py-8">{children}</main>
        </Web3Provider>
      </body>
    </html>
  );
}
