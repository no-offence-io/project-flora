"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CART_ADDED, useCart } from "./cart-context";
import { useT } from "@/components/i18n-provider";
import { formatNok } from "@/lib/money";

const SHORTEN_AFTER = 3800;

/**
 * The pill at the bottom of the screen. Adding a piece opens it with the photo; after a few seconds
 * it shrinks to "Cart · 1" and stays while the cart has items. Tapping it opens a small cart.
 */
export default function CartPill() {
  const { items, count } = useCart();
  const t = useT();
  const pathname = usePathname();
  const [added, setAdded] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    const onAdded = (e: Event) => {
      setAdded((e as CustomEvent<string>).detail);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setAdded(null), SHORTEN_AFTER);
    };
    window.addEventListener(CART_ADDED, onAdded);
    return () => {
      window.removeEventListener(CART_ADDED, onAdded);
      window.clearTimeout(timer.current);
    };
  }, []);

  const hidden = count === 0 || pathname.startsWith("/checkout") || pathname.startsWith("/order-complete");
  const totalOre = items.reduce((sum, item) => sum + item.unitPriceOre * item.quantity, 0);
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
          <Link href="/checkout" className="cart-pill-go" onClick={() => setFull(false)}>{t("cart.continue")}</Link>
        </div>
      </div>
      <button type="button" aria-expanded={full} onClick={() => setFull((v) => !v)} className="cart-pill-bar">
        <span className="cart-pill-photo">
          {latest && <Image src={latest.image.src} alt="" fill sizes="44px" className="object-contain p-[5px]" />}
        </span>
        <span className="cart-pill-text">
          <span>
            {added ? t("cart.added") : `${t("cart.link")} · ${count}`}
            <small>{added ?? formatNok(totalOre)}</small>
          </span>
          {added && <span className="cart-pill-view">{t("cart.view")}</span>}
        </span>
      </button>
    </div>
  );
}
