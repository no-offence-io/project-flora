"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CART_ADDED, useCart } from "./cart-context";
import TextScroll from "./text-scroll";
import { useT } from "@/components/i18n-provider";
import { formatNok } from "@/lib/money";

const SHOWN_FOR = 4500;

/**
 * The pill at the bottom of the screen, there for a few seconds after adding a piece. Tapping it
 * opens a small cart, which stays until it is closed.
 */
export default function CartPill() {
  const { items, count } = useCart();
  const t = useT();
  const pathname = usePathname();
  const [added, setAdded] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [full, setFull] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    const onAdded = (e: Event) => {
      setAdded((e as CustomEvent<string>).detail);
      setShown(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setShown(false), SHOWN_FOR);
    };
    window.addEventListener(CART_ADDED, onAdded);
    return () => {
      window.removeEventListener(CART_ADDED, onAdded);
      window.clearTimeout(timer.current);
    };
  }, []);

  const toggle = () => {
    window.clearTimeout(timer.current);
    if (full) setShown(false);
    setFull(!full);
  };
  const hidden = !shown || count === 0 || pathname.startsWith("/checkout") || pathname.startsWith("/order-complete");
  const latest = items[items.length - 1];

  return (
    <div className={`cart-pill ${hidden ? "" : "is-on"} ${full && !hidden ? "is-full" : ""}`} role="status">
      <div className="cart-pill-mini">
        <div>
          <ul>
            {items.map((item) => (
              <li key={item.key}>
                <span>{item.name}{item.quantity > 1 ? ` × ${item.quantity}` : ""}</span>
                <span>{formatNok(item.unitPriceOre * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <Link href="/checkout" className="cart-pill-go" onClick={toggle}>{t("cart.continue")}</Link>
        </div>
      </div>
      <button type="button" aria-expanded={full} onClick={toggle} className="cart-pill-bar">
        <span className="cart-pill-photo">
          {latest && <Image src={latest.image.src} alt="" fill sizes="44px" className="object-contain p-[5px]" />}
        </span>
        <span className="cart-pill-text">
          <span className="min-w-0">
            {t("cart.added")}
            <small><TextScroll text={added ?? ""} /></small>
          </span>
          <span className="cart-pill-view">{t("cart.view")}</span>
        </span>
      </button>
    </div>
  );
}
