import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, authConfigured, signOut } from "@/auth";

export const metadata = { title: "Your account – Flöra" };

/** Preview data until customer accounts store real measurements. */
const SAMPLE_MEASUREMENTS = [
  { label: "Bust", value: "88" },
  { label: "Waist", value: "70" },
  { label: "Hips", value: "94" },
];

export default async function AccountPage() {
  const session = authConfigured ? await auth() : null;
  if (!session?.user) redirect("/account/login");

  return (
    <div className="flex flex-col gap-[42px]">
      <div className="flex flex-col gap-[12px]">
        <h1 className="m-0 font-americana text-big-header-mobile capitalize text-black md:text-big-header-desktop">Hi {session.user.name?.split(" ")[0] ?? "there"}</h1>
        <p className="m-0 font-gotham text-paragraph text-black/50">{session.user.email}</p>
      </div>

      <div className="grid gap-[42px] md:grid-cols-2">
        <section className="flex flex-col gap-[12px] font-gotham text-paragraph text-black md:border-[0.5px] md:border-black/25 md:p-[24px]">
          <h2 className="m-0 flex items-center justify-between font-gotham text-paragraph">
            My measurements
            <Link href="/account/measurements" className="underline hover:opacity-70 transition-opacity">Edit</Link>
          </h2>
          <div className="h-px w-full bg-black/25" />
          <ul className="m-0 flex list-none flex-col gap-[5px] p-0 text-[11px] leading-normal">
            {SAMPLE_MEASUREMENTS.map((a) => (
              <li key={a.label}>
                {a.label}: <span className="text-black/50">—</span>
              </li>
            ))}
          </ul>
          <p className="m-0 text-black/50">Filled in for you at checkout once saved.</p>
        </section>

        <section className="flex flex-col gap-[12px] font-gotham text-paragraph text-black md:border-[0.5px] md:border-black/25 md:p-[24px]">
          <h2 className="m-0 flex items-center justify-between font-gotham text-paragraph">
            Orders
            <Link href="/account/orders" className="underline hover:opacity-70 transition-opacity">All orders</Link>
          </h2>
          <div className="h-px w-full bg-black/25" />
          <p className="m-0 text-black/50">No orders yet.</p>
        </section>
      </div>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
        className="flex items-center gap-[24px] font-gotham text-paragraph"
      >
        <button type="submit" className="text-black underline hover:opacity-70 transition-opacity">Sign out</button>
        <span className="text-black/50">Delete account</span>
      </form>
    </div>
  );
}
