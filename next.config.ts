import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product and page photos live in Sanity; next/image refuses any host not listed here.
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/559r73zo/**" }],
    // The logo may be an uploaded SVG; it is only ever ours, from Sanity, and served with a CSP that forbids scripts.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
