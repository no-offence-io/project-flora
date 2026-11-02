/** Set the first time a visitor sees the intro. The server reads it, so returning visitors never get a flash of it. */
export const INTRO_COOKIE = "flora-intro-seen";

/** How a photo waits to load, chosen on the dashboard's Page transitions page. */
export const LOADING_STYLES = ["a", "b", "c"] as const;
export type LoadingStyle = (typeof LOADING_STYLES)[number];
export const parseLoadingStyle = (v: unknown): LoadingStyle => (LOADING_STYLES.includes(v as LoadingStyle) ? (v as LoadingStyle) : "b");

/**
 * Runs before the page's first image. Marks each image when it finishes or fails, so the stylesheet
 * can fade it in. One the browser already has shows at once: either it is complete the moment it
 * is added, or it finishes within a moment of being added. Resource timing can't tell this, as a
 * photo reused from memory still reports its first, slow download.
 * Without JavaScript the `reveal` class never appears and images behave as normal.
 */
export const IMAGE_REVEAL_SCRIPT = `(function(){var d=document,s=new WeakMap;d.documentElement.classList.add("reveal");function a(i){if(i.complete&&i.naturalWidth)i.dataset.ready="instant";else s.set(i,performance.now())}new MutationObserver(function(m){m.forEach(function(r){r.addedNodes.forEach(function(n){if(n.nodeType!==1)return;if(n.tagName==="IMG")a(n);else n.querySelectorAll("img").forEach(a)})})}).observe(d,{childList:true,subtree:true});function f(e){var i=e.target;if(!i||i.tagName!=="IMG"||i.dataset.ready)return;var t=s.get(i);i.dataset.ready=t!==undefined&&performance.now()-t<150?"instant":"fade"}d.addEventListener("load",f,true);d.addEventListener("error",f,true)})()`;
