import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://0xshubhs.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/private", "/write", "/edit/", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
