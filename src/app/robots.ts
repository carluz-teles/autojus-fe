import type { MetadataRoute } from "next";

import { getLandingSite } from "@/features/landing/seo";

export default function robots(): MetadataRoute.Robots {
  const site = getLandingSite();
  if (!site.indexable) return { rules: { userAgent: "*", disallow: "/" } };

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/$",
        "/?",
        // Let crawlers discover the permanent redirect from the previous URL.
        "/lp$",
        "/lp?",
        "/lp/$",
        "/_next/",
        "/atjud-mark.svg$",
        "/llms.txt$",
        "/llm.text$",
        "/sitemap.xml$",
      ],
      disallow: "/",
    },
    sitemap: `${site.origin}/sitemap.xml`,
  };
}
