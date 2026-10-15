/**
 * Writes the Norwegian (bokmål) translation of every piece of content into Sanity, next to the
 * English value, so the EN / NO switch has something to switch to. Re-runnable: it replaces the
 * "no" entry and never touches "en". Editors can change any of it afterwards in the admin or Studio.
 *
 *   node scripts/translate-no.mjs
 */
import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const client = createClient({ projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: env.NEXT_PUBLIC_SANITY_DATASET, apiVersion: "2026-02-01", token: env.SANITY_TOKEN, useCdn: false });

const kinds = { string: "internationalizedArrayStringValue", text: "internationalizedArrayTextValue", blocks: "internationalizedArraySimpleBlockContentValue" };
/** Keep every existing entry except "no", then add the Norwegian one. */
const withNo = (arr, value, kind = "string") => [...(arr ?? []).filter((v) => v._key !== "no"), ...(value === undefined ? [] : [{ _key: "no", _type: kinds[kind], value }])];
const en = (arr) => arr?.find((v) => v._key === "en")?.value;
const rnd = () => Math.random().toString(36).slice(2, 10);
const blocks = (paragraphs) => paragraphs.map((text) => ({ _key: rnd(), _type: "block", style: "normal", markDefs: [], children: [{ _key: "s", _type: "span", text, marks: [] }] }));

// ---- translations, keyed by the English value ---------------------------------------------------
const T = {
  // product names, descriptions
  "Miss Flow Top": "Miss Flow-topp", "Wrap Skirt": "Omslagsskjørt", "Tie Top": "Knytetopp", "Long Skirt": "Langt skjørt",
  "Our bestseller and the reason for our sudden success, we owe Miss Flow everything.": "Vår bestselger og grunnen til vår plutselige suksess – vi skylder Miss Flow alt.",
  "An asymmetric wrap that moves with you, cut from the same soft jersey as Miss Flow.": "Et asymmetrisk omslagsskjørt som beveger seg med deg, sydd i samme myke jersey som Miss Flow.",
  "A bandeau with long ties, worn knotted at the front or back.": "En bandeau med lange bånd som knytes foran eller bak.",
  "A floor-length skirt with a fold-over waist and a single seam.": "Et gulvlangt skjørt med brettet linning og én enkelt søm.",
  // colours
  "Gray": "Grå", "Terracotta": "Terrakotta", "Olive": "Oliven", "Light grey": "Lys grå", "Blush": "Lys rosa", "Sage": "Salvie", "Taupe": "Taupe", "Rust": "Rust", "Forest": "Skoggrønn", "Dusty blue": "Støvblå", "Cream": "Krem",
  // spec rows
  "Archive / Miss Flow Top": "Arkiv / Miss Flow-topp", "Archive / Wrap Skirt": "Arkiv / Omslagsskjørt", "Archive / Tie Top": "Arkiv / Knytetopp", "Archive / Long Skirt": "Arkiv / Langt skjørt",
  "Size & Fit": "Størrelse og passform", "Model info, Size recommendation, size guide": "Modellinfo, størrelsesanbefaling, størrelsesguide",
  "Shipping & Returns": "Frakt og retur", "Delivery options, return policy, payment options": "Leveringsalternativer, returrett, betalingsmåter",
  "Availability": "Tilgjengelighet", "Out Of Stock": "Utsolgt",
  // photo descriptions
  "Grey Miss Flow top, front": "Grå Miss Flow-topp, forfra", "Grey Miss Flow top": "Grå Miss Flow-topp", "Terracotta Miss Flow top": "Miss Flow-topp i terrakotta", "Olive Miss Flow top": "Miss Flow-topp i oliven",
  "Light grey wrap skirt": "Lys grått omslagsskjørt", "Blush wrap skirt": "Omslagsskjørt i lys rosa", "Sage wrap skirt": "Omslagsskjørt i salvie",
  "Taupe tie top": "Knytetopp i taupe", "Rust tie top": "Knytetopp i rust", "Forest tie top": "Knytetopp i skoggrønn",
  "Light grey long skirt": "Lys grått langt skjørt", "Dusty blue long skirt": "Langt skjørt i støvblå", "Cream long skirt": "Langt skjørt i krem",
  "Model wearing the Flöra yoga wear set": "Modell i Flöras yogasett", "Fabric moving in the light": "Stoff i bevegelse i lyset", "Garment laid out on stone tiles": "Plagg lagt ut på steinfliser", "Model standing in a cave doorway": "Modell i en huleåpning",
  // front page
  "All items": "Alle produkter", "Values": "Verdier",
  "We've spent the last months developing a collection built around one idea: movement should feel as good as it looks. Soft, considered fabrics. Cuts that hold their shape. Pieces made to move from the studio into the rest of your day.":
    "De siste månedene har vi utviklet en kolleksjon bygget rundt én idé: bevegelse skal føles like godt som det ser ut. Myke, gjennomtenkte stoffer. Snitt som holder formen. Plagg laget for å følge deg fra studioet og ut i resten av dagen.",
  "Care For Your Garments": "Ta vare på plaggene dine",
  "Wash cool, dry flat, and these pieces will outlast the season. Natural fabrics reward a little attention, and asking less of the machine asks less of the planet too.": "Vask kaldt og tørk flatt, så varer disse plaggene lenger enn sesongen. Naturmaterialer belønner litt omtanke – og å kreve mindre av maskinen krever mindre av planeten også.",
  "Our Materials": "Våre materialer",
  "Soft, considered natural fabrics chosen for how they move and how they last. Nothing that looks good once and gives up by the third wear.": "Myke, gjennomtenkte naturstoffer valgt for hvordan de beveger seg og hvor lenge de varer. Ingenting som ser bra ut én gang og gir opp ved tredje bruk.",
  "Minimal Waste": "Minimalt svinn",
  "Small, focused runs so nothing is made that will not be worn. We would rather sell out than send a season to landfill.": "Små, fokuserte produksjoner, så ingenting lages som ikke blir brukt. Vi vil heller bli utsolgt enn å sende en sesong til søppelfyllingen.",
  "Natural Beauty": "Naturlig skjønnhet",
  "Real skin, real texture, and real bodies in everything we show. What you see in our images is what the garment actually looks like.": "Ekte hud, ekte tekstur og ekte kropper i alt vi viser. Det du ser på bildene våre, er slik plagget faktisk ser ut.",
  // banner
  "Join the family": "Bli med i familien", "Sign up": "Meld deg på",
  // faq
  "Will you be offering more sizes?": "Kommer dere med flere størrelser?",
  "How do I find my size?": "Hvordan finner jeg min størrelse?", "Size guidance is on the way.": "Størrelsesveiledning kommer snart.",
  "Are you hiring?": "Ansetter dere?", "Not right now, but keep an eye on our channels.": "Ikke akkurat nå, men følg med i kanalene våre.",
  "Sponsorships & Ambassadors": "Sponsing og ambassadører", "Send us a message and tell us about yourself.": "Send oss en melding og fortell om deg selv.",
  "Currently, our garments are available in sizes XS–XL. As an independent brand, we have chosen to begin with a focused size range that allows us to maintain the high standards of quality and craftsmanship we strive for in every garment.": "Plaggene våre finnes for øyeblikket i størrelsene XS–XL. Som et uavhengig merke har vi valgt å starte med et fokusert størrelsesutvalg, slik at vi kan holde den høye standarden for kvalitet og håndverk vi strekker oss etter i hvert plagg.",
  "As we grow, our ambition is to expand our size range to include XXS and XXL, creating a more inclusive selection for our community.": "Etter hvert som vi vokser, er ambisjonen å utvide utvalget med XXS og XXL og skape et mer inkluderende tilbud for fellesskapet vårt.",
  "If your size is not currently available, we sincerely apologize for the inconvenience and appreciate your understanding as we continue to grow.": "Hvis din størrelse ikke er tilgjengelig nå, beklager vi ulempen og setter pris på forståelsen mens vi fortsetter å vokse.",
};
const t = (s) => (s === undefined || s === null ? undefined : (T[s] ?? (console.warn("  (no translation for)", JSON.stringify(s).slice(0, 70)), undefined)));

const POLICIES = {
  terms: ["Vilkår", "Vilkårene som gjelder når du handler hos Flöra. De beskriver hvordan bestillinger legges inn, betales og leveres, og hva du kan forvente av oss.", [
    "Bestillinger — En bestilling er bekreftet når du mottar vår ordrebekreftelse på e-post. Vi kan kansellere bestillinger som ikke kan leveres, og refunderer da hele beløpet.",
    "Priser og betaling — Alle priser vises inkludert mva. Betaling trekkes når bestillingen legges inn, via betalingsmåtene som vises i kassen.",
    "Forhåndsbestillinger — Forhåndsbestilte plagg sendes på datoen som er oppgitt på produktsiden. Vi gir beskjed hvis datoen endres.",
    "Kontakt — Spørsmål om disse vilkårene kan sendes til hello@projectflora.net."]],
  "refunds-and-exchange": ["Retur og bytte", "Vi vil at hvert plagg skal føles riktig. Hvis det ikke gjør det, kan du returnere eller bytte innen 14 dager etter levering.", [
    "Slik returnerer du — Start en retur ved å sende oss en e-post med ordrenummeret ditt. Vi sender deg returetikett og instruksjoner.",
    "Plaggets tilstand — Plagg må være ubrukte, uvaskede og returneres med alle merkelapper på.",
    "Refusjon — Refusjon utbetales til den opprinnelige betalingsmåten innen 10 virkedager etter at vi har mottatt returen.",
    "Bytte — Bytte til en annen størrelse eller farge er gratis innenfor Norge. Fortell oss hva du ønsker når du starter returen."]],
  privacy: ["Personvern", "Slik håndterer vi personopplysningene dine når du besøker siden, melder deg på nyheter eller legger inn en bestilling.", [
    "Hva vi samler inn — Navn, kontaktinformasjon, leveringsadresse og ordrehistorikk, samt anonym bruksdata fra siden.",
    "Hvordan vi bruker det — Til å behandle bestillinger, gi kundestøtte og, hvis du har samtykket, sende deg nyheter om nye plagg.",
    "Deling — Opplysninger deles bare med tjenestene vi trenger for å drive butikken, som betalings- og leveringsleverandører.",
    "Dine rettigheter — Du kan når som helst be om innsyn i, retting av eller sletting av opplysningene dine ved å kontakte oss."]],
  shipping: ["Frakt", "Hvor vi sender, hvor lang tid det tar og hva det koster.", [
    "Destinasjoner — Vi sender innenfor Norge og til resten av Europa. Flere destinasjoner kommer.",
    "Leveringstid — Bestillinger sendes innen to virkedager. Levering tar 2–5 virkedager i Norge og 5–10 dager ellers i Europa.",
    "Pris — Frakt beregnes i kassen ut fra adressen din. Bestillinger over 1500 kr sendes gratis innenfor Norge.",
    "Sporing — Du får en sporingslenke på e-post så snart pakken er på vei."]],
};

// ---- apply ----------------------------------------------------------------------------------------
const img = (image) => (image ? { ...image, alt: withNo(image.alt, t(en(image.alt))) } : image);

console.log("products");
for (const p of await client.fetch(`*[_type == "product"]`)) {
  await client.patch(p._id).set({
    name: withNo(p.name, t(en(p.name))),
    description: withNo(p.description, t(en(p.description)), "text"),
    images: (p.images ?? []).map(img),
    colors: (p.colors ?? []).map((c) => ({ ...c, name: withNo(c.name, t(en(c.name))), image: img(c.image) })),
    specs: (p.specs ?? []).map((s) => ({ ...s, label: withNo(s.label, t(en(s.label))), value: withNo(s.value, t(en(s.value))) })),
  }).commit();
  console.log("  ", en(p.name), "→", t(en(p.name)));
}

console.log("front page");
const home = await client.fetch(`*[_id == "homePage"][0]`);
await client.patch("homePage").set({
  productsTitle: withNo(home.productsTitle, t(en(home.productsTitle))),
  "values.title": withNo(home.values?.title, t(en(home.values?.title))),
  "values.intro": withNo(home.values?.intro, t(en(home.values?.intro)), "text"),
  "values.items": (home.values?.items ?? []).map((v) => ({ ...v, title: withNo(v.title, t(en(v.title))), description: withNo(v.description, t(en(v.description)), "text"), image: img(v.image) })),
}).commit();

console.log("site settings");
const s = await client.fetch(`*[_id == "siteSettings"][0]`);
await client.patch("siteSettings").set({
  signUpTitle: withNo(s.signUpTitle, t(en(s.signUpTitle))),
  signUpText: withNo(s.signUpText, t(en(s.signUpText)), "text"),
  signUpButton: withNo(s.signUpButton, t(en(s.signUpButton))),
}).commit();

console.log("faq");
for (const f of await client.fetch(`*[_type == "faqItem"]`)) {
  const enBlocks = f.answer?.find((v) => v._key === "en")?.value ?? [];
  const paragraphs = enBlocks.map((b) => (b.children ?? []).map((c) => c.text).join(""));
  await client.patch(f._id).set({
    question: withNo(f.question, t(en(f.question))),
    answer: withNo(f.answer, blocks(paragraphs.map((p) => t(p) ?? p)), "blocks"),
  }).commit();
  console.log("  ", en(f.question), "→", t(en(f.question)));
}

console.log("policy pages");
for (const [page, [title, intro, items]] of Object.entries(POLICIES)) {
  const d = await client.fetch(`*[_id == $id][0]`, { id: `policy-${page}` });
  await client.patch(`policy-${page}`).set({ title: withNo(d.title, title), intro: withNo(d.intro, intro, "text"), body: withNo(d.body, blocks(items), "blocks") }).commit();
  console.log("  ", page, "→", title);
}
console.log("done");
