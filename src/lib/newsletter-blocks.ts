/*
 * The newsletter as the editor builds it: an ordered list of blocks, each with its text in both
 * languages. Client-safe (no server imports) so the drag-and-drop editor and the server renderer
 * share one definition. Stored on the `newsletter` document as JSON.
 */
export type L = { en: string; no: string };
export const l = (en = "", no = ""): L => ({ en, no });

export type Block =
  | { id: string; kind: "kicker"; text: L }
  | { id: string; kind: "heading"; text: L }
  | { id: string; kind: "text"; text: L }
  | { id: string; kind: "image"; src: string; href: string; alt: string }
  | { id: string; kind: "twoImages"; left: { src: string; caption: L; href: string }; right: { src: string; caption: L; href: string } }
  | { id: string; kind: "products"; ids: string[]; useGifs: boolean; title: L }
  | { id: string; kind: "quote"; text: L }
  | { id: string; kind: "button"; label: L; href: string }
  | { id: string; kind: "divider" }
  | { id: string; kind: "spacer"; height: number };

export type BlockKind = Block["kind"];

export const BLOCK_LABELS: Record<BlockKind, { label: string; hint: string }> = {
  kicker: { label: "Small line", hint: "Spaced capitals, e.g. NEW COLLECTION" },
  heading: { label: "Heading", hint: "Large serif title" },
  text: { label: "Text", hint: "A paragraph or two, centred" },
  image: { label: "Photo", hint: "Full width, edge to edge" },
  twoImages: { label: "Two photos", hint: "Side by side with captions" },
  products: { label: "Pieces", hint: "Products two across, GIFs if they have one" },
  quote: { label: "Quote", hint: "One line in the serif" },
  button: { label: "Button", hint: "Thin-bordered, spaced capitals" },
  divider: { label: "Short line", hint: "A 32px hairline" },
  spacer: { label: "Space", hint: "Empty vertical room" },
};

export const newId = () => Math.random().toString(36).slice(2, 10);

export function newBlock(kind: BlockKind): Block {
  const id = newId();
  switch (kind) {
    case "kicker":
      return { id, kind, text: l("New collection", "Ny kolleksjon") };
    case "heading":
      return { id, kind, text: l("A title", "En tittel") };
    case "text":
      return { id, kind, text: l("", "") };
    case "image":
      return { id, kind, src: "", href: "", alt: "" };
    case "twoImages":
      return { id, kind, left: { src: "", caption: l(), href: "" }, right: { src: "", caption: l(), href: "" } };
    case "products":
      return { id, kind, ids: [], useGifs: true, title: l("The pieces", "Plaggene") };
    case "quote":
      return { id, kind, text: l("", "") };
    case "button":
      return { id, kind, label: l("Discover the collection", "Se kolleksjonen"), href: "" };
    case "divider":
      return { id, kind };
    case "spacer":
      return { id, kind, height: 48 };
  }
}

/** The lookbook layout as a starting point, so a new newsletter is never a blank page. */
export function defaultBlocks(base: string, productIds: string[]): Block[] {
  return [
    { id: newId(), kind: "kicker", text: l("New collection", "Ny kolleksjon") },
    { id: newId(), kind: "image", src: `${base}/email/collection-hero.jpg`, href: `${base}/shop`, alt: "" },
    { id: newId(), kind: "heading", text: l("Cut from the cloth, sewn to you", "Skåret fra stoffet, sydd til deg") },
    { id: newId(), kind: "divider" },
    {
      id: newId(),
      kind: "text",
      text: l(
        "Four pieces in natural fabrics, made in Norway to the measurements you give us. No sizes, no seasons, no hurry.\n\nEverything about Flöra is transparent. We are far from perfect, but we are honest — so you know exactly what you are getting.",
        "Fire plagg i naturlige stoffer, sydd i Norge etter målene du gir oss. Ingen størrelser, ingen sesonger, ingen hast.\n\nAlt ved Flöra er transparent. Vi er langt fra perfekte, men vi er ærlige – så du vet nøyaktig hva du får.",
      ),
    },
    {
      id: newId(),
      kind: "twoImages",
      left: { src: `${base}/email/collection-a.jpg`, caption: l("The wrap skirt", "Omslagsskjørtet"), href: `${base}/shop` },
      right: { src: `${base}/email/collection-b.jpg`, caption: l("The Miss Flow top", "Miss Flow-toppen"), href: `${base}/shop` },
    },
    { id: newId(), kind: "products", ids: productIds, useGifs: true, title: l("The pieces", "Plaggene") },
    { id: newId(), kind: "quote", text: l("Natural fabrics, honest production, and respect for the bodies wearing them.", "Naturlige stoffer, ærlig produksjon og respekt for kroppene som bærer dem.") },
    { id: newId(), kind: "image", src: `${base}/email/collection-wide.jpg`, href: `${base}/shop`, alt: "" },
    { id: newId(), kind: "text", text: l("Each piece is made when you order it. Give us four measurements and it is cut for you, not for a size chart.", "Hvert plagg sys når du bestiller det. Gi oss fire mål, så skjæres det til deg – ikke til en størrelsestabell.") },
    { id: newId(), kind: "button", label: l("Discover the collection", "Se kolleksjonen"), href: `${base}/shop` },
  ];
}

/** Tolerant parse of what is stored: anything that isn't a well-formed list becomes an empty one. */
export function parseBlocks(json: string | null | undefined): Block[] {
  if (!json) return [];
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v) ? (v.filter((b) => b && typeof b === "object" && "kind" in b && "id" in b) as Block[]) : [];
  } catch {
    return [];
  }
}

/** For the list page: the first heading, else the subject. */
export function titleOf(blocks: Block[], lang: "en" | "no" = "en"): string {
  const h = blocks.find((b) => b.kind === "heading");
  return h && h.kind === "heading" ? h.text[lang] || h.text.en : "";
}
