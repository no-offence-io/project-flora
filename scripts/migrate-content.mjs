/**
 * One-off, re-runnable: copies the shop's static content (src/data/*, the front page) into Sanity so
 * the admin and Studio open with real products and texts. Upserts by slug or fixed id, uploads each
 * image file once, and writes English only — Norwegian is for the editors.
 *
 *   node scripts/migrate-content.mjs
 */
import { createClient } from "@sanity/client";
import { createReadStream, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const client = createClient({
  projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2026-02-01",
  token: env.SANITY_TOKEN,
  useCdn: false,
});

const en = (value, kind = "String") => (value ? [{ _key: "en", _type: `internationalizedArray${kind}Value`, value }] : []);
const key = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const block = (text) => ({ _key: key(text).slice(0, 12) + Math.random().toString(36).slice(2, 6), _type: "block", style: "normal", markDefs: [], children: [{ _key: "s", _type: "span", text, marks: [] }] });
const blocks = (paragraphs) => en(paragraphs.map(block), "SimpleBlockContent");

const uploaded = new Map();
async function image(src, alt) {
  if (!uploaded.has(src)) {
    const asset = await client.assets.upload("image", createReadStream(join("public", src)), { filename: basename(src) });
    uploaded.set(src, asset._id);
    console.log("  uploaded", src);
  }
  return { _type: "localizedImage", _key: key(src), asset: { _type: "reference", _ref: uploaded.get(src) }, alt: en(alt) };
}

// ---- products -------------------------------------------------------------------------------
const SHARED_SPECS = [
  { label: "Size & Fit", value: "Model info, Size recommendation, size guide", expandable: true },
  { label: "Shipping & Returns", value: "Delivery options, return policy, payment options", expandable: true },
  { label: "Availability", value: "Out Of Stock" },
];
const PRODUCTS = [
  { slug: "miss-flow-top", category: "Tops", name: "Miss Flow Top", priceOre: 129000, stock: 12,
    description: "Our bestseller and the reason for our sudden success, we owe Miss Flow everything.",
    colors: [["#646875", "Gray", "/products/top-grey.png", "Grey Miss Flow top"], ["#c07a52", "Terracotta", "/products/miss-flow-top-terracotta.png", "Terracotta Miss Flow top"], ["#7c7a4e", "Olive", "/products/miss-flow-top-olive.png", "Olive Miss Flow top"]],
    images: [["/products/top-grey.png", "Grey Miss Flow top, front"]],
    specs: [{ label: "Gray", value: "Archive / Miss Flow Top", emphasis: true, hideOnMobile: true }, ...SHARED_SPECS] },
  { slug: "wrap-skirt", category: "Skirts", name: "Wrap Skirt", priceOre: 89000, stock: 8,
    description: "An asymmetric wrap that moves with you, cut from the same soft jersey as Miss Flow.",
    colors: [["#d3d9e0", "Light grey", "/products/wrap-skirt-light.png", "Light grey wrap skirt"], ["#e8c9c0", "Blush", "/products/wrap-skirt-blush.png", "Blush wrap skirt"], ["#c3cbb8", "Sage", "/products/wrap-skirt-sage.png", "Sage wrap skirt"]],
    images: [["/products/wrap-skirt-light.png", "Light grey wrap skirt"]],
    specs: [{ label: "Light grey", value: "Archive / Wrap Skirt", emphasis: true, hideOnMobile: true }, ...SHARED_SPECS] },
  { slug: "tie-top", category: "Tops", name: "Tie Top", priceOre: 89000, stock: 8,
    description: "A bandeau with long ties, worn knotted at the front or back.",
    colors: [["#706663", "Taupe", "/products/tie-top-taupe.png", "Taupe tie top"], ["#a15c3e", "Rust", "/products/tie-top-rust.png", "Rust tie top"], ["#4f5b47", "Forest", "/products/tie-top-forest.png", "Forest tie top"]],
    images: [["/products/tie-top-taupe.png", "Taupe tie top"]],
    specs: [{ label: "Taupe", value: "Archive / Tie Top", emphasis: true, hideOnMobile: true }, ...SHARED_SPECS] },
  { slug: "long-skirt", category: "Skirts", name: "Long Skirt", priceOre: 89000, stock: 5, compareAtPriceOre: 129000,
    description: "A floor-length skirt with a fold-over waist and a single seam.",
    colors: [["#d5dae3", "Light grey", "/products/long-skirt-light.png", "Light grey long skirt"], ["#aebdd1", "Dusty blue", "/products/long-skirt-dusty-blue.png", "Dusty blue long skirt"], ["#e8ddc7", "Cream", "/products/long-skirt-cream.png", "Cream long skirt"]],
    images: [["/products/long-skirt-light.png", "Light grey long skirt"]],
    specs: [{ label: "Light grey", value: "Archive / Long Skirt", emphasis: true, hideOnMobile: true }, ...SHARED_SPECS] },
];

console.log("products");
for (const p of PRODUCTS) {
  const doc = {
    _type: "product",
    name: en(p.name),
    slug: { _type: "slug", current: p.slug },
    category: p.category,
    description: en(p.description, "Text"),
    visible: true,
    priceOre: p.priceOre,
    compareAtPriceOre: p.compareAtPriceOre ?? null,
    stock: p.stock,
    images: await Promise.all(p.images.map(([src, alt]) => image(src, alt))),
    colors: await Promise.all(p.colors.map(async ([hex, name, src, alt]) => ({ _type: "color", _key: key(name), name: en(name), hex, image: await image(src, alt) }))),
    specs: p.specs.map((s) => ({ _type: "spec", _key: key(s.label), label: en(s.label), value: en(s.value), emphasis: !!s.emphasis, expandable: !!s.expandable, hideOnMobile: !!s.hideOnMobile })),
  };
  const existing = await client.fetch(`*[_type == "product" && slug.current == $slug][0]._id`, { slug: p.slug });
  if (existing) { await client.patch(existing).set(doc).commit(); console.log("  updated", p.slug); }
  else { await client.create(doc); console.log("  created", p.slug); }
}

// ---- front page ------------------------------------------------------------------------------
console.log("front page");
const VALUES = [
  ["Care For Your Garments", "Wash cool, dry flat, and these pieces will outlast the season. Natural fabrics reward a little attention, and asking less of the machine asks less of the planet too.", "/dropdown/related-product.jpg", "Model wearing the Flöra yoga wear set"],
  ["Our Materials", "Soft, considered natural fabrics chosen for how they move and how they last. Nothing that looks good once and gives up by the third wear.", "/product/lifestyle-fabric-wave.jpg", "Fabric moving in the light"],
  ["Minimal Waste", "Small, focused runs so nothing is made that will not be worn. We would rather sell out than send a season to landfill.", "/product/lifestyle-lying-tiles.jpg", "Garment laid out on stone tiles"],
  ["Natural Beauty", "Real skin, real texture, and real bodies in everything we show. What you see in our images is what the garment actually looks like.", "/product/lifestyle-cave-doorway.jpg", "Model standing in a cave doorway"],
];
const INTRO = "We've spent the last months developing a collection built around one idea: movement should feel as good as it looks. Soft, considered fabrics. Cuts that hold their shape. Pieces made to move from the studio into the rest of your day.";
await client.createOrReplace({
  _id: "homePage", _type: "homePage",
  hero: { videoUrl: "https://www.prosjectflora.com/hero/front-hero-1080.mp4", logoPosition: "left" },
  productsTitle: en("All items"),
  values: { title: en("Values"), intro: en(INTRO, "Text"), items: await Promise.all(VALUES.map(async ([title, description, src, alt]) => ({ _type: "value", _key: key(title), title: en(title), description: en(description, "Text"), image: await image(src, alt) }))) },
});
console.log("  homePage written");

// ---- site settings -----------------------------------------------------------------------------
console.log("site settings");
await client.createOrReplace({
  _id: "siteSettings", _type: "siteSettings",
  siteName: "Flöra",
  announcement: [],
  signUpTitle: en("Join the family"),
  signUpText: en(INTRO, "Text"),
  signUpButton: en("Sign up"),
  footerText: [],
  instagram: "https://www.instagram.com/",
  contactEmail: "hello@projectflora.net",
  shippingOre: 8900,
  freeShippingFromOre: 150000,
});
console.log("  siteSettings written");

// ---- FAQ ---------------------------------------------------------------------------------------
console.log("faq");
const FAQ = [
  ["Will you be offering more sizes?", ["Currently, our garments are available in sizes XS–XL. As an independent brand, we have chosen to begin with a focused size range that allows us to maintain the high standards of quality and craftsmanship we strive for in every garment.", "As we grow, our ambition is to expand our size range to include XXS and XXL, creating a more inclusive selection for our community.", "If your size is not currently available, we sincerely apologize for the inconvenience and appreciate your understanding as we continue to grow."]],
  ["How do I find my size?", ["Size guidance is on the way."]],
  ["Are you hiring?", ["Not right now, but keep an eye on our channels."]],
  ["Sponsorships & Ambassadors", ["Send us a message and tell us about yourself."]],
];
for (const [i, [q, paragraphs]] of FAQ.entries()) {
  const doc = { _type: "faqItem", question: en(q), answer: blocks(paragraphs), order: (i + 1) * 10 };
  const existing = await client.fetch(`*[_type == "faqItem" && question[_key == "en"][0].value == $q][0]._id`, { q });
  if (existing) await client.patch(existing).set(doc).commit(); else await client.create(doc);
  console.log("  ", existing ? "updated" : "created", q);
}

// ---- policy pages ------------------------------------------------------------------------------
console.log("policy pages");
const POLICIES = {
  "terms": ["Terms", "The terms that apply when you shop with Flöra. They cover how orders are placed, paid for and fulfilled, and what you can expect from us.", [["Orders", "An order is confirmed once you receive our confirmation e-mail. We may cancel orders that cannot be fulfilled and will refund you in full."], ["Prices & payment", "All prices are shown including VAT. Payment is taken when the order is placed through the methods shown at checkout."], ["Pre-orders", "Pre-ordered garments ship on the date shown on the product page. We will let you know if that date changes."], ["Contact", "Questions about these terms can be sent to hello@projectflora.net."]]],
  "refunds-and-exchange": ["Refunds & Exchange", "We want every piece to feel right. If it doesn't, you can return or exchange it within 14 days of delivery.", [["How to return", "Start a return by e-mailing us with your order number. We will send a return label and instructions."], ["Condition of items", "Garments must be unworn, unwashed and returned with all tags attached."], ["Refunds", "Refunds are issued to the original payment method within 10 working days of receiving the return."], ["Exchanges", "Exchanges for another size or colour are free within Norway. Tell us what you would like when you start the return."]]],
  "privacy": ["Privacy", "How we handle your personal data when you visit the site, sign up for updates or place an order.", [["What we collect", "Your name, contact details, delivery address and order history, plus anonymous usage data from the site."], ["How we use it", "To process orders, provide support, and, if you have opted in, to send you news about new garments."], ["Sharing", "Data is shared only with the services we need to run the shop, such as payment and delivery providers."], ["Your rights", "You can ask to see, correct or delete your data at any time by contacting us."]]],
  "shipping": ["Shipping", "Where we ship, how long it takes and what it costs.", [["Destinations", "We ship within Norway and to the rest of Europe. Other destinations are coming."], ["Delivery time", "Orders ship within two working days. Delivery takes 2–5 working days in Norway and 5–10 days elsewhere in Europe."], ["Cost", "Shipping is calculated at checkout based on your address. Orders over 1500 NOK ship free within Norway."], ["Tracking", "You will receive a tracking link by e-mail as soon as your parcel is on its way."]]],
};
for (const [page, [title, intro, items]] of Object.entries(POLICIES)) {
  await client.createOrReplace({ _id: `policy-${page}`, _type: "policyPage", page, title: en(title), intro: en(intro, "Text"), body: blocks(items.map(([t, c]) => `${t} — ${c}`)) });
  console.log("  ", page);
}
console.log("done. images uploaded:", uploaded.size);
