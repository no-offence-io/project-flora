import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product and page photos live in Sanity; next/image refuses any host not listed here.
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/559r73zo/**" }],
  },
};

export default nextConfig;
