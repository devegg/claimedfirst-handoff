import type { MetadataRoute } from "next";

// Private trial: ask all crawlers to stay out. Replace with an allow rule to launch.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
