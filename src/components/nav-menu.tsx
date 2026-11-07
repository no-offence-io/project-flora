"use client";

import Image from "next/image";
import LanguageSwitch from "./language-switch";
import type { Lang } from "@/lib/language-shared";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SOCIAL_LINKS } from "./footer-shared";
import { useT } from "@/components/i18n-provider";
import RolloverText from "./rollover-text";
import ThemeSwitch from "./theme-switch";
import { leadsElsewhere, PAGE_COVERED } from "./page-transition";
import type { Theme } from "@/lib/theme-shared";

const MENU_LINKS = [
  { key: "nav.shop", href: "/shop" },
  { key: "nav.values", href: "/values" },
  { key: "nav.about", href: "/about" },
] as const;

type NavMenuContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const NavMenuContext = createContext<NavMenuContextValue | null>(null);

export function NavMenuProvider({
  children,
  initialOpen = false,
}: {
  children: ReactNode;
  initialOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);
  return <NavMenuContext.Provider value={value}>{children}</NavMenuContext.Provider>;
}

export function useNavMenu() {
  const ctx = useContext(NavMenuContext);
  if (!ctx) throw new Error("useNavMenu must be used inside NavMenuProvider");
  return ctx;
}

/** Three-line burger from the Figma mobile navbar (36px wide, 3px lines, 8px gap). */
export function BurgerButton({ className = "" }: { className?: string }) {
  const t = useT();
  const { open } = useNavMenu();
  return (
    <button
      type="button"
      onClick={open}
      aria-label={t("menu.open")}
      aria-haspopup="dialog"
      className={`flex w-[36px] flex-col gap-[8px] hover:opacity-70 transition-opacity ${className}`}
    >
      <span className="block h-[3px] w-full bg-current" />
      <span className="block h-[3px] w-full bg-current" />
      <span className="block h-[3px] w-full bg-current" />
    </button>
  );
}

/**
 * Full-screen navigation from Figma "Phone navbar expanded" (3:200) below `md`
 * and "Desktop navbar expanded" (3:146) from `md` up.
 */
export function NavMenuOverlay({ lang = "en", logoSrc = "/footer/flora-logo.svg", theme = "auto" }: { lang?: Lang; logoSrc?: string; theme?: Theme }) {
  const t = useT();
  const { isOpen, close } = useNavMenu();
  // A link to another page leaves the menu up while the page fades out; it closes instantly once
  // the screen is covered, so nothing disappears before the fade. Same-page links close as usual.
  const [instant, setInstant] = useState(false);
  useEffect(() => {
    const onCovered = () => {
      setInstant(true);
      close();
      window.setTimeout(() => setInstant(false), 50);
    };
    window.addEventListener(PAGE_COVERED, onCovered);
    return () => window.removeEventListener(PAGE_COVERED, onCovered);
  }, [close]);
  const onLink = (href: string) => () => {
    if (!leadsElsewhere(href)) close();
  };
  // Always mounted, so the photo loads with the page and opening is a fade, never a pop-in.
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (isOpen) closeRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close]);

  // Links stagger in after the backdrop, and out in reverse before it fades (see `stagger`).
  const count = MENU_LINKS.length;
  const stagger = (i: number) => ({
    transitionDelay: isOpen ? `${180 + i * 70}ms` : `${(count - 1 - i) * 40}ms`,
  });
  // Opacity only: the links stay exactly where they are while they fade in and out.
  const piece = `transition-opacity duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? "opacity-100" : "opacity-0"}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={`fixed inset-0 z-50 overflow-hidden p-[24px] text-white transition-[opacity,visibility] md:p-[42px] ${
        isOpen ? "visible opacity-100 duration-[450ms]" : "invisible opacity-0 delay-[220ms] duration-[400ms]"
      } ${instant ? "!transition-none !delay-0" : ""}`}
    >
      {/* Background photo with the dark overlay: 49% on mobile, 30% on desktop */}
      <div aria-hidden className="absolute inset-0">
        <Image
          src="/menu/menu-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          preload
          loading="eager"
          onLoad={() => setPhotoLoaded(true)}
          className={`object-cover object-[50%_0%] transition-opacity duration-700 ease-out md:object-[50%_60%] ${photoLoaded ? "opacity-100" : "opacity-0"}`}
        />
        <div className="absolute inset-0 bg-black/49 md:bg-black/30" />
      </div>

      {/* Wordmark, desktop only */}
      <Link href="/" aria-label="Flöra home" onClick={onLink("/")} className="relative hidden md:block">
        <Image
          src={logoSrc}
          alt="Flöra"
          width={486.544}
          height={109.193}
          className="h-[109.193px] w-[486.544px]"
        />
      </Link>

      {/* Close cross: 36px box with 4px lines on mobile, 47.6px box with 5.2px lines on desktop */}
      <button
        type="button"
        ref={closeRef}
        onClick={close}
        aria-label={t("menu.close")}
        className="absolute top-[24px] right-[24px] flex size-[36px] items-center justify-center outline-none hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white md:top-[42px] md:right-[42px] md:size-[47.587px]"
      >
        <span className="absolute h-[4px] w-[46.439px] rotate-45 bg-white md:h-[5.201px] md:w-[62.098px]" />
        <span className="absolute h-[4px] w-[46.439px] -rotate-45 bg-white md:h-[5.201px] md:w-[62.098px]" />
      </button>

      {/* Links, centered on the screen */}
      <nav
        aria-label="Primary"
        className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[24px] font-americana text-big-header-mobile capitalize whitespace-nowrap md:flex-row md:gap-[60px] md:text-big-header-desktop"
      >
        {MENU_LINKS.map((link, i) => (
          <Link key={link.key} href={link.href} onClick={onLink(link.href)} className={`block ${piece} ${instant ? "!transition-none" : ""}`} style={stagger(i)}>
            <RolloverText text={t(link.key)} capitalize />
          </Link>
        ))}
      </nav>

      {/* Language, under the links on mobile and bottom-left on desktop */}
      <div className="absolute bottom-[84px] left-1/2 flex -translate-x-1/2 flex-col items-center gap-[12px] md:bottom-[42px] md:left-[42px] md:translate-x-0 md:flex-row md:gap-[42px]">
        <span className={`block ${piece}`} style={{ transitionDelay: isOpen ? `${180 + count * 70}ms` : "0ms" }}>
          <LanguageSwitch current={lang} tone="light" />
        </span>
        <span className={`block ${piece}`} style={{ transitionDelay: isOpen ? `${180 + (count + 1) * 70}ms` : "0ms" }}>
          <ThemeSwitch current={theme} labels={{ light: t("theme.light"), dark: t("theme.dark"), auto: t("theme.auto") }} />
        </span>
      </div>

      {/* Social icons: bottom-center at 24px tall on mobile, bottom-right at 40px tall on desktop.
          Figma orders them Instagram, YouTube, Spotify on mobile and Instagram, Spotify, YouTube on desktop. */}
      <ul className="absolute bottom-[24px] left-1/2 flex h-[24px] -translate-x-1/2 items-center gap-[20px] md:right-[42px] md:bottom-[42px] md:left-auto md:h-[40px] md:translate-x-0 md:gap-[24px]">
        {SOCIAL_LINKS.map((social) => {
          const order =
            social.label === "YouTube" ? "order-2 md:order-3" : social.label === "Spotify" ? "order-3 md:order-2" : "order-1";
          return (
            <li key={social.label} className={`flex ${order}`}>
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
                  className="h-[24px] w-auto md:h-[40px]"
                  style={{ width: "auto" }}
                />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
