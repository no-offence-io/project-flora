import Image from "next/image";

export const NAV_LINKS = [
  { key: "footer.terms", href: "/terms" },
  { key: "footer.refunds", href: "/refunds-and-exchange" },
  { key: "footer.privacy", href: "/privacy" },
  { key: "footer.shipping", href: "/shipping" },
  { key: "footer.faq", href: "/faq" },
] as const;

export const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/",
    icon: "/footer/instagram.svg",
    width: 18,
    height: 18,
  },
  {
    label: "Spotify",
    href: "https://open.spotify.com/",
    icon: "/footer/spotify.svg",
    width: 18,
    height: 18,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/",
    icon: "/footer/youtube.svg",
    width: 26.25,
    height: 18,
  },
];

/** Same photo and overlays used by both footer variants. */
export function FooterOverlay() {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.28) 100%), linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.66) 100%)",
      }}
    />
  );
}

export function SocialLinks() {
  return (
    <ul className="flex h-[18px] items-center gap-[20px]">
      {SOCIAL_LINKS.map((social) => (
        <li key={social.label} className="flex">
          <a
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
            className="hover:opacity-70 transition-opacity"
          >
            <Image
              src={social.icon}
              alt=""
              width={social.width}
              height={social.height}
              style={{ width: social.width, height: social.height }}
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
