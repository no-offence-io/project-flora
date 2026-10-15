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
  useState,
  type ReactNode,
} from "react";
import { SOCIAL_LINKS } from "./footer-shared";

const MENU_LINKS = [
  { label: "Shop", href: "/shop" },
  { label: "Values", href: "/values" },
  { label: "About", href: "/about" },
];

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
  const { open } = useNavMenu();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open menu"
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
export function NavMenuOverlay({ lang = "en" }: { lang?: Lang }) {
  const { isOpen, close } = useNavMenu();

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

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
      className="fixed inset-0 z-50 overflow-hidden p-[24px] text-white md:p-[42px]"
    >
      {/* Background photo with the dark overlay: 49% on mobile, 30% on desktop */}
      <div aria-hidden className="absolute inset-0">
        <Image
          src="/menu/menu-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[50%_0%] md:object-[50%_60%]"
        />
        <div className="absolute inset-0 bg-black/49 md:bg-black/30" />
      </div>

      {/* Wordmark, desktop only */}
      <Link href="/" aria-label="Flöra home" onClick={close} className="relative hidden md:block">
        <Image
          src="/footer/flora-logo.svg"
          alt="Flöra"
          width={486.544}
          height={109.193}
          className="h-[109.193px] w-[486.544px]"
        />
      </Link>

      {/* Close cross: 36px box with 4px lines on mobile, 47.6px box with 5.2px lines on desktop */}
      <button
        type="button"
        onClick={close}
        aria-label="Close menu"
        autoFocus
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
        {MENU_LINKS.map((link) => (
          <Link key={link.label} href={link.href} onClick={close} className="hover:opacity-70 transition-opacity">
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Language, under the links on mobile and bottom-left on desktop */}
      <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2 md:bottom-[42px] md:left-[42px] md:translate-x-0">
        <LanguageSwitch current={lang} tone="light" />
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
