import type { MetadataRoute } from "next";

import { getLandingSite } from "@/features/landing/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getLandingSite();
  // A preview has no canonical public pages to submit to a search engine.
  if (!site.indexable || !site.canonical) return [];
  return [{ url: site.canonical }];
}
