import { redirect } from "next/navigation";
import { Heading } from "@/components/account-ui";
import { getCustomer } from "@/lib/customer";
import { removeCard } from "@/lib/customer-actions";
import { getT } from "@/lib/i18n-server";
import { getStripe } from "@/lib/stripe";

/**
 * Saved cards, read straight from Stripe for this customer's Stripe record. We only ever get the
 * brand, the last four digits and the expiry — Stripe never gives anyone the full number.
 */
export default async function CardsPage({ searchParams }: { searchParams: Promise<{ removed?: string }> }) {
  const [customer, t, { removed }] = await Promise.all([getCustomer(), getT(), searchParams]);
  if (!customer) redirect("/account/login?next=/account/cards");
  let cards: { id: string; brand: string; last4: string; exp: string }[] = [];
  if (customer.stripeCustomerId) {
    const list = await getStripe().paymentMethods.list({ customer: customer.stripeCustomerId, type: "card", limit: 20 }).catch(() => null);
    cards = (list?.data ?? []).map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand ?? "card",
      last4: pm.card?.last4 ?? "····",
      exp: pm.card ? `${String(pm.card.exp_month).padStart(2, "0")}/${String(pm.card.exp_year).slice(-2)}` : "",
    }));
  }
  return (
    <div className="flex flex-col gap-[24px] md:max-w-[521px]">
      <Heading>{t("account.cards")}</Heading>
      <p className="m-0 font-gotham text-paragraph text-black/70">{t("account.cardsIntro")}</p>
      {removed && <p className="m-0 font-gotham text-paragraph text-black/50">{t("account.cardRemoved")}</p>}
      {cards.length === 0 ? (
        <p className="m-0 font-gotham text-paragraph text-black/50">{t("account.noCards")}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-[12px] p-0 font-gotham text-paragraph text-black">
          {cards.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-[12px] border-[0.25px] border-black/25 p-[12px]">
              <span>
                <span className="capitalize">{c.brand}</span> •••• {c.last4} <span className="text-black/50">{t("account.expires", { date: c.exp })}</span>
              </span>
              <form action={removeCard}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="text-black/50 underline">{t("account.removeCard")}</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
