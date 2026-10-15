import type { Lang } from "./language-shared";

/*
 * Every fixed string the shop shows, in both languages. Content (products, pages) lives in Sanity;
 * this is the chrome around it: navigation, cart, checkout, buttons, messages. Keys are grouped by
 * where they appear. A missing Norwegian entry falls back to English rather than to a blank.
 */
const en = {
  "nav.shop": "Shop", "nav.values": "Values", "nav.about": "About",
  "menu.open": "Open menu", "menu.close": "Close menu",
  "footer.terms": "Terms", "footer.refunds": "Refunds & Exchange", "footer.privacy": "Privacy", "footer.shipping": "Shipping", "footer.faq": "FAQ",
  "footer.credit": "Design & website by No Offence",
  "cart.link": "Cart", "cart.items": "items", "cart.itemsTag": "Items", "cart.summary": "Order Summary", "cart.empty": "Your cart is empty.",
  "cart.qty": "qty", "cart.remove": "Remove", "cart.continue": "Continue to checkout",
  "product.add": "Add To Cart", "product.added": "Added to cart", "product.colours": "Available colours", "product.sale": "On sale", "product.alsoLike": "You may also like",
  "slideshow.seeAll": "See all",
  "shop.categories": "Product Categories", "shop.filter": "Filter", "shop.all": "All", "shop.search": "Search products", "shop.searchPlaceholder": "Search...", "shop.noMatch": "No items match.",
  "category.Tops": "Tops", "category.Skirts": "Skirts", "category.Sets": "Sets", "category.Accessories": "Accessories",
  "steps.cart": "Shopping cart", "steps.details": "Checkout Details", "steps.complete": "Order Complete",
  "checkout.title": "Billing Details",
  "form.email": "E-mail", "form.firstName": "First name", "form.lastName": "Last name", "form.country": "Country", "form.street": "Street address",
  "form.apartment": "Apartment, suite, unit, etc.", "form.postcode": "Postcode/ ZIP", "form.city": "Town/ city", "form.phone": "Phone", "form.note": "Note",
  "country.Norway": "Norway", "country.Sweden": "Sweden", "country.Denmark": "Denmark", "country.Finland": "Finland", "country.Germany": "Germany", "country.United Kingdom": "United Kingdom",
  "summary.subtotal": "Subtotal", "summary.shipping": "Shipping", "summary.free": "Free", "summary.vat": "VAT 25% (included)", "summary.total": "Total",
  "pay.orCard": "Or pay with card", "pay.confirm": "Confirm order", "pay.confirming": "Confirming…", "pay.preparing": "Preparing payment…",
  "pay.privacy": "Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our",
  "pay.privacyLink": "privacy policy", "pay.backToShop": "Back to the shop",
  "pay.failed": "Payment failed. Please try again.", "pay.checkCard": "Please check your card details.", "pay.couldNotStart": "Could not start payment.",
  "pay.vippsSoon": "Vipps is coming soon. Please choose another way to pay for now.", "pay.cartUpdated": "Your cart was updated. Please review the total and confirm again.",
  "complete.checking": "Checking your payment…", "complete.none": "No payment to show.", "complete.back": "Back to checkout", "complete.thanks": "Thank you",
  "complete.success": "Your payment of {amount} went through. Your order reference is", "complete.receipt": "A receipt is on its way to your email.",
  "complete.continue": "Continue shopping", "complete.almost": "Almost there", "complete.processing": "Your payment is still processing. Reference",
  "complete.processing2": "We will email you as soon as it is confirmed.", "complete.notCompleted": "Payment not completed",
  "complete.nothingCharged": "The payment did not go through and nothing was charged.",
  "faq.title": "Frequently asked questions",
  "signup.placeholder": "E-mail...", "signup.button": "Get Notified",
  "comingSoon.title": "Coming soon", "comingSoon.text": "Something new is growing. Our first collection arrives shortly.",
  "meta.shop": "All items – Flöra", "meta.faq": "FAQ – Flöra", "meta.checkout": "Checkout – Flöra", "meta.orderComplete": "Order complete – Flöra", "meta.comingSoon": "Flöra – Coming soon",
} as const;

export type Key = keyof typeof en;

const no: Record<Key, string> = {
  "nav.shop": "Butikk", "nav.values": "Verdier", "nav.about": "Om oss",
  "menu.open": "Åpne meny", "menu.close": "Lukk meny",
  "footer.terms": "Vilkår", "footer.refunds": "Retur og bytte", "footer.privacy": "Personvern", "footer.shipping": "Frakt", "footer.faq": "Ofte stilte spørsmål",
  "footer.credit": "Design og nettside av No Offence",
  "cart.link": "Handlekurv", "cart.items": "varer", "cart.itemsTag": "varer", "cart.summary": "Ordreoversikt", "cart.empty": "Handlekurven er tom.",
  "cart.qty": "stk", "cart.remove": "Fjern", "cart.continue": "Gå til kassen",
  "product.add": "Legg i handlekurv", "product.added": "Lagt i handlekurven", "product.colours": "Tilgjengelige farger", "product.sale": "På salg", "product.alsoLike": "Du vil kanskje også like",
  "slideshow.seeAll": "Se alle",
  "shop.categories": "Produktkategorier", "shop.filter": "Filter", "shop.all": "Alle", "shop.search": "Søk etter produkter", "shop.searchPlaceholder": "Søk...", "shop.noMatch": "Ingen treff.",
  "category.Tops": "Topper", "category.Skirts": "Skjørt", "category.Sets": "Sett", "category.Accessories": "Tilbehør",
  "steps.cart": "Handlekurv", "steps.details": "Betalingsdetaljer", "steps.complete": "Ordre fullført",
  "checkout.title": "Faktureringsdetaljer",
  "form.email": "E-post", "form.firstName": "Fornavn", "form.lastName": "Etternavn", "form.country": "Land", "form.street": "Gateadresse",
  "form.apartment": "Leilighet, etasje osv.", "form.postcode": "Postnummer", "form.city": "Poststed", "form.phone": "Telefon", "form.note": "Melding",
  "country.Norway": "Norge", "country.Sweden": "Sverige", "country.Denmark": "Danmark", "country.Finland": "Finland", "country.Germany": "Tyskland", "country.United Kingdom": "Storbritannia",
  "summary.subtotal": "Delsum", "summary.shipping": "Frakt", "summary.free": "Gratis", "summary.vat": "Mva. 25 % (inkludert)", "summary.total": "Totalt",
  "pay.orCard": "Eller betal med kort", "pay.confirm": "Bekreft bestilling", "pay.confirming": "Bekrefter…", "pay.preparing": "Forbereder betaling…",
  "pay.privacy": "Personopplysningene dine brukes til å behandle bestillingen, støtte opplevelsen din på nettstedet og til andre formål beskrevet i vår",
  "pay.privacyLink": "personvernerklæring", "pay.backToShop": "Tilbake til butikken",
  "pay.failed": "Betalingen mislyktes. Prøv igjen.", "pay.checkCard": "Sjekk kortopplysningene dine.", "pay.couldNotStart": "Kunne ikke starte betalingen.",
  "pay.vippsSoon": "Vipps kommer snart. Velg en annen betalingsmåte så lenge.", "pay.cartUpdated": "Handlekurven ble oppdatert. Sjekk totalen og bekreft på nytt.",
  "complete.checking": "Sjekker betalingen din…", "complete.none": "Ingen betaling å vise.", "complete.back": "Tilbake til kassen", "complete.thanks": "Takk",
  "complete.success": "Betalingen din på {amount} gikk gjennom. Ordrereferansen din er", "complete.receipt": "En kvittering er på vei til e-posten din.",
  "complete.continue": "Fortsett å handle", "complete.almost": "Nesten i mål", "complete.processing": "Betalingen din behandles fortsatt. Referanse",
  "complete.processing2": "Vi sender deg en e-post så snart den er bekreftet.", "complete.notCompleted": "Betalingen ble ikke fullført",
  "complete.nothingCharged": "Betalingen gikk ikke gjennom, og ingenting ble belastet.",
  "faq.title": "Ofte stilte spørsmål",
  "signup.placeholder": "E-post...", "signup.button": "Få beskjed",
  "comingSoon.title": "Kommer snart", "comingSoon.text": "Noe nytt vokser frem. Vår første kolleksjon kommer snart.",
  "meta.shop": "Alle produkter – Flöra", "meta.faq": "Ofte stilte spørsmål – Flöra", "meta.checkout": "Kasse – Flöra", "meta.orderComplete": "Ordre fullført – Flöra", "meta.comingSoon": "Flöra – Kommer snart",
};

const DICT: Record<Lang, Record<Key, string>> = { en, no };

export type Translate = (key: Key, vars?: Record<string, string | number>) => string;

export function translator(lang: Lang): Translate {
  return (key, vars) => {
    let s = DICT[lang][key] ?? en[key];
    for (const [k, v] of Object.entries(vars ?? {})) s = s.replace(`{${k}}`, String(v));
    return s;
  };
}
