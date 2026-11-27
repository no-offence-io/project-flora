/*
 * The shop's search. Runs in the browser over the products already on the page, so it has no server
 * dependencies and is plain enough to unit-test.
 *
 * A search is a set of words, not a phrase: every word typed has to be found somewhere on the
 * product, in any order, and need not be next to another. "julie white" finds "Miss Julie Leather
 * White". A word is found when it is a word of the product, begins one ("whi"), sits inside one
 * ("eather"), or is a near miss of one in the name, colour or category ("jule", "lether"), so a slip
 * of the finger or a half-typed word still finds the piece. Accents and case never matter.
 */

/** Lower case, no accents, Norwegian letters spelled the way people type them without a Norwegian keyboard. */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const words = (text: string) => fold(text).split(" ").filter(Boolean);

/** Edits between two words (a swap of neighbours counts as one), given up on as soon as it passes `max`. */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let before: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, before[j - 2] + 1);
      row.push(d);
      if (d < best) best = d;
    }
    if (best > max) return max + 1;
    before = prev;
    prev = row;
  }
  return prev[b.length];
}

/** How many slips a word of this length is forgiven. Short words must be right: "top" is not "toy". */
const slips = (length: number) => (length >= 8 ? 2 : length >= 4 ? 1 : 0);

/** How well a typed word matches one word of the product: 0 for not at all, 1 for exactly. */
function wordMatch(typed: string, word: string, forgiving: boolean): number {
  if (word === typed) return 1;
  if (word.startsWith(typed)) return 0.9;
  if (typed.length >= 2 && word.includes(typed)) return 0.6;
  if (!forgiving) return 0;
  const allowed = slips(typed.length);
  if (!allowed) return 0;
  if (distance(typed, word, allowed) <= allowed) return 0.5;
  // Still typing: "lethe" is on its way to "leather".
  if (word.length > typed.length && distance(typed, word.slice(0, typed.length + 1), allowed) <= allowed) return 0.4;
  return 0;
}

export type SearchField = {
  text: string;
  /** How much a match here counts when ranking. */
  weight: number;
  /** Near misses are forgiven in short, specific texts (a name, a colour), not in running prose. */
  forgiving?: boolean;
};

/**
 * 0 when the product doesn't match the search, otherwise higher the better it matches. An empty
 * search matches everything equally.
 */
export function searchScore(query: string, fields: SearchField[]): number {
  const typed = words(query);
  if (!typed.length) return 1;
  const indexed = fields.map((f) => ({ ...f, words: words(f.text) }));
  let score = 0;
  for (const t of typed) {
    let best = 0;
    for (const f of indexed) {
      for (const w of f.words) {
        const m = wordMatch(t, w, f.forgiving ?? false) * f.weight;
        if (m > best) best = m;
      }
    }
    if (!best) return 0;
    score += best;
  }
  // The words typed exactly as they stand in a text is the strongest sign of all.
  const phrase = typed.join(" ");
  if (typed.length > 1) for (const f of indexed) if (f.words.join(" ").includes(phrase)) score += f.weight;
  return score;
}

/** The items that match, best first; items that match equally well keep the order they came in. */
export function search<T>(items: T[], query: string, fieldsOf: (item: T) => SearchField[]): T[] {
  if (!fold(query)) return items;
  return items
    .map((item, index) => ({ item, index, score: searchScore(query, fieldsOf(item)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.item);
}
