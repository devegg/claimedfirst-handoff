import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Private trial: tell search engines not to index anything, including images. Remove to launch.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
