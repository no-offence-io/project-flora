import { redirect } from "next/navigation";
import { auth, authConfigured } from "@/auth";

export const metadata = { title: "Your orders – Flöra" };

/** Order history. Will list the signed-in customer's orders by email once accounts are stored. */
export default async function AccountOrdersPage() {
  if (!authConfigured || !(await auth())?.user) redirect("/account/login");
  const sample = [
    { number: "FL-EXAMPLE1", date: "14 Oct 2026", status: "Shipped", total: "1 379 kr", items: "Miss Flow Top × 1", tracking: "RR123456789NO" },
    { number: "FL-EXAMPLE2", date: "2 Sep 2026", status: "Delivered", total: "979 kr", items: "Wrap Skirt × 1", tracking: "" },
  ];
  return (
    <div className="flex flex-col gap-[24px]">
      <h1 className="m-0 font-americana text-big-header-mobile capitalize text-black md:text-big-header-desktop">Your orders</h1>
      <p className="m-0 font-gotham text-paragraph text-black/50">Preview with example orders.</p>
      <ul className="m-0 flex list-none flex-col gap-[12px] p-0 font-gotham text-paragraph text-black md:max-w-[640px]">
        {sample.map((o) => (
          <li key={o.number} className="flex flex-col gap-[12px] border-[0.25px] border-black/25 p-[12px]">
            <div className="flex items-center justify-between gap-[12px]">
              <span>{o.number}</span>
              <span className="border-[0.5px] border-black px-[4px] py-[1px]">{o.status}</span>
            </div>
            <ul className="m-0 flex list-none flex-col gap-[5px] p-0 text-[11px] leading-normal">
              <li>Ordered: <span className="text-black/50">{o.date}</span></li>
              <li>Items: <span className="text-black/50">{o.items}</span></li>
              {o.tracking && <li>Tracking: <span className="text-black/50">{o.tracking}</span></li>}
            </ul>
            <div className="flex justify-between">
              <span>Total</span>
              <span>{o.total}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
