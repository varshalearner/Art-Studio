import type { MetadataRoute } from "next";
import { siteConfig } from "@/config";

/**
 * Sitemap. Static routes always; in live mode you could extend this to query
 * approved listings and artists server-side (only Approved listings may appear).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const routes = [
    "",
    "/shop",
    "/artists",
    "/commission",
    "/sell",
    "/about",
    "/faq",
    "/contact",
    "/legal/privacy",
    "/legal/terms",
    "/legal/refunds",
    "/legal/shipping",
  ];
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/shop" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
