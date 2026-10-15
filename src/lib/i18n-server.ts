import "server-only";
import { translator, type Translate } from "./i18n";
import { getLanguage } from "./language";

/** The translator for the current request's language, for server components. */
export async function getT(): Promise<Translate> {
  return translator(await getLanguage());
}
