import type { MetadataRoute } from "next";

/** The web app manifest: what Android (and "Add to Home Screen" everywhere) uses for the icon and name. */
export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flöra",
    short_name: "Flöra",
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/pwa-icon?size=192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png" },
    ],
  };
}
