import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { defaultBlocks } from "./newsletter-blocks";
import { renderNewsletter } from "./notify";

const products = {
  p1: { name: "Wrap Skirt", priceOre: 89_000, image: "https://cdn.sanity.io/images/x/production/a.png", gif: "https://cdn.sanity.io/files/x/production/a.gif", href: "https://www.prosjectflora.com/shop/wrap-skirt" },
  p2: { name: "Miss Flow Top", priceOre: 129_000, image: "https://cdn.sanity.io/images/x/production/b.png", href: "https://www.prosjectflora.com/shop/miss-flow-top" },
};

describe("newsletter renderer", () => {
  const blocks = defaultBlocks("https://www.prosjectflora.com", ["p1", "p2"]);
  it("renders every block in English with GIFs where present and the unsubscribe link", () => {
    const html = renderNewsletter(blocks, { lang: "en", products, unsubscribeUrl: "https://x/unsub?id=1" });
    expect(html).toContain("Cut from the cloth, sewn to you");
    expect(html).toContain("a.gif"); // p1 has a GIF
    expect(html).toContain("b.png?w=480&h=600&fit=max&fm=png"); // p2 falls back to the photo, sized by the CDN
    expect(html).toContain("Wrap Skirt");
    expect(html).toContain('href="https://x/unsub?id=1"');
    expect(html).toContain("Discover the collection");
  });
  it("renders Norwegian text and falls back to English per field", () => {
    const html = renderNewsletter(blocks, { lang: "no", products, unsubscribeUrl: "#" });
    expect(html).toContain("Skåret fra stoffet");
    expect(html).toContain("Meld deg av");
    expect(html).toContain("Wrap Skirt"); // product names stay English
  });
  it("honours useGifs=false and skips empty photo blocks", () => {
    const noGifs = blocks.map((b) => (b.kind === "products" ? { ...b, useGifs: false } : b.kind === "image" ? { ...b, src: "" } : b));
    const html = renderNewsletter(noGifs, { lang: "en", products, unsubscribeUrl: "#" });
    expect(html).not.toContain("a.gif");
    expect(html).not.toContain("collection-hero.jpg");
  });
  it("escapes what the editor types", () => {
    const html = renderNewsletter([{ id: "x", kind: "heading", text: { en: "<script>alert(1)</script>", no: "" } }], { lang: "en", products: {}, unsubscribeUrl: "#" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
