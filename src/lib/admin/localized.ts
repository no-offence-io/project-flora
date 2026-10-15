/**
 * Helpers for the bilingual fields. In Sanity every translatable field is an array of
 * `{ _key: language, value }` (sanity-plugin-internationalized-array); the admin forms post plain
 * `name.en` / `name.no` inputs and these turn one into the other.
 */

export const LANGS = ["en", "no"] as const;
export type Lang = (typeof LANGS)[number];

export type LocalizedString = { _key: string; _type?: string; value?: string }[];

/** Minimal Portable Text: one paragraph per block, plain text only. */
export type Block = { _key: string; _type: "block"; style: "normal"; markDefs: []; children: { _key: string; _type: "span"; text: string; marks: [] }[] };
export type LocalizedBlocks = { _key: string; _type?: string; value?: Block[] }[];

export function getText(arr: LocalizedString | undefined, lang: Lang): string {
  return arr?.find((v) => v._key === lang)?.value ?? "";
}

/** Reads `${name}.en` / `${name}.no` from a form into the array shape. Empty values are dropped. */
export function readLocalizedString(form: FormData, name: string, kind: "string" | "text" = "string"): LocalizedString {
  const type = kind === "string" ? "internationalizedArrayStringValue" : "internationalizedArrayTextValue";
  return LANGS.flatMap((lang) => {
    const value = String(form.get(`${name}.${lang}`) ?? "").trim();
    return value ? [{ _key: lang, _type: type, value }] : [];
  });
}

const key = () => Math.random().toString(36).slice(2, 10);

/** Blank-line separated paragraphs → Portable Text blocks. */
export function toBlocks(text: string): Block[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ _key: key(), _type: "block", style: "normal", markDefs: [], children: [{ _key: key(), _type: "span", text: p, marks: [] }] }));
}

/** Portable Text blocks → blank-line separated paragraphs, for editing in a textarea. */
export function fromBlocks(blocks: Block[] | undefined): string {
  return (blocks ?? []).map((b) => (b.children ?? []).map((c) => c.text).join("")).join("\n\n");
}

export function getBlocksText(arr: LocalizedBlocks | undefined, lang: Lang): string {
  return fromBlocks(arr?.find((v) => v._key === lang)?.value);
}

export function readLocalizedBlocks(form: FormData, name: string): LocalizedBlocks {
  return LANGS.flatMap((lang) => {
    const value = String(form.get(`${name}.${lang}`) ?? "").trim();
    return value ? [{ _key: lang, _type: "internationalizedArraySimpleBlockContentValue", value: toBlocks(value) }] : [];
  });
}
