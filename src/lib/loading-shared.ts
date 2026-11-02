/** How a photo waits to load, chosen on the dashboard's Page transitions page. */
export const LOADING_STYLES = ["a", "b", "c"] as const;
export type LoadingStyle = (typeof LOADING_STYLES)[number];
export const parseLoadingStyle = (v: unknown): LoadingStyle => (LOADING_STYLES.includes(v as LoadingStyle) ? (v as LoadingStyle) : "b");

/**
 * Runs before the page's first image. Marks each one as it finishes (or fails) so the stylesheet
 * can fade it in; one that came straight from the browser's cache is marked to show at once.
 * Without JavaScript the `reveal` class never appears and images behave as normal.
 */
export const IMAGE_REVEAL_SCRIPT = `(function(){var d=document;d.documentElement.classList.add("reveal");function f(e){var i=e.target;if(!i||i.tagName!=="IMG")return;var r=performance.getEntriesByName(i.currentSrc||i.src).pop();i.dataset.ready=r&&r.duration<80?"instant":"fade"}d.addEventListener("load",f,true);d.addEventListener("error",f,true)})()`;
