import { createManualOrder } from "../actions";
import { Button, Card, Checkbox, Heading, Input, Labelled, Muted, Select, Subheading, Textarea, TextLink } from "@/components/admin/ui";
import { adminClient, kr } from "@/lib/admin/sanity";
import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/order-status";
import { requireAdmin } from "@/lib/admin/session";

type Product = { _id: string; name?: string; priceOre?: number; sizes?: string[] };

const SLOTS = [0, 1, 2, 3, 4, 5];

/** Add an order by hand: a PR gift, a sale at a market, anything paid outside the shop. */
export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  const products = await adminClient().fetch<Product[]>(
    `*[_type == "product" && !(_id in path("drafts.**"))] | order(name[_key == "en"][0].value asc){ _id, "name": name[_key == "en"][0].value, priceOre, "sizes": sizes[].label }`,
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/orders">← Orders</TextLink>
        <Heading>Add order</Heading>
        <Muted>For things that don&apos;t go through the shop: PR gifts, a sale at a market, a dress paid by Vipps in person. It sits with the other orders and counts the stock down. No email is sent.</Muted>
        {error && (
          <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">
            {error}
          </p>
        )}
      </div>

      <form action={createManualOrder} className="flex max-w-[860px] flex-col gap-[42px]">
        <Card>
          <Subheading>What kind</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px] md:flex-row">
            <Labelled label="Type" className="flex-1">
              <Select name="kind" defaultValue="pr">
                <option value="pr">PR / gift — free</option>
                <option value="sale">Sale outside the shop</option>
              </Select>
            </Labelled>
            <Labelled label="Paid with (for a sale)" hint="E.g. Vipps, cash, bank transfer." className="flex-1">
              <Input name="paidWith" placeholder="Vipps" />
            </Labelled>
          </div>
          <div className="flex flex-col gap-[24px] md:flex-row">
            <Labelled label="Status" className="flex-1">
              <Select name="status" defaultValue="delivered">
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </Select>
            </Labelled>
            <Labelled label="Date" className="flex-1">
              <Input name="orderedAt" type="date" defaultValue={today} />
            </Labelled>
          </div>
        </Card>

        <Card>
          <Subheading>Who</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px] md:flex-row">
            <Labelled label="Name" className="flex-1"><Input name="name" required autoComplete="off" /></Labelled>
            <Labelled label="Email (optional)" hint="Links the order to their customer page." className="flex-1"><Input name="email" type="email" autoComplete="off" /></Labelled>
          </div>
          <div className="flex flex-col gap-[24px] md:flex-row">
            <Labelled label="Phone (optional)" className="flex-1"><Input name="phone" autoComplete="off" /></Labelled>
            <Labelled label="Language" className="flex-1">
              <Select name="language" defaultValue="no">
                <option value="no">Norsk</option>
                <option value="en">English</option>
              </Select>
            </Labelled>
          </div>
          <Labelled label="Address (optional)" hint="Street, postcode and town, country — separated by commas.">
            <Input name="address" autoComplete="off" />
          </Labelled>
        </Card>

        <Card>
          <Subheading>What</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Muted className="text-[11px]">Pick a product, or type a name for something not in the shop. Leave the price empty: a gift is free, a sale uses the shop price.</Muted>
          {SLOTS.map((i) => (
            <div key={i} className="flex flex-col gap-[12px] border-t border-black/10 pt-[12px] md:flex-row md:items-end">
              <Labelled label={i === 0 ? "Product" : `Product ${i + 1}`} className="md:flex-[2]">
                <Select name={`product_${i}`} defaultValue="">
                  <option value="">{i === 0 ? "Choose…" : "—"}</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} · {kr(p.priceOre)}{p.sizes?.length ? ` · sizes ${p.sizes.join("/")}` : ""}
                    </option>
                  ))}
                </Select>
              </Labelled>
              <Labelled label="Or a name" className="md:flex-1"><Input name={`custom_${i}`} placeholder="Something else" /></Labelled>
              <Labelled label="Size" className="md:w-[80px]"><Input name={`size_${i}`} placeholder="—" /></Labelled>
              <Labelled label="Qty" className="md:w-[64px]"><Input name={`qty_${i}`} inputMode="numeric" defaultValue="1" /></Labelled>
              <Labelled label="Price (kr)" className="md:w-[100px]"><Input name={`price_${i}`} inputMode="decimal" placeholder="auto" /></Labelled>
            </div>
          ))}
          <div className="flex flex-col gap-[24px] border-t border-black/25 pt-[24px] md:flex-row md:items-end">
            <Labelled label="Shipping (kr)" className="md:w-[160px]"><Input name="shipping" inputMode="decimal" placeholder="0" /></Labelled>
            <Checkbox name="stock" label="Count the stock down" defaultChecked />
          </div>
        </Card>

        <Card>
          <Subheading>Notes</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Labelled label="Note on the order" hint="Shown at the top of the order, like a customer's note — e.g. who it's for and why.">
            <Textarea name="note" rows={3} />
          </Labelled>
          <Labelled label="Internal note" hint="Only you see this.">
            <Textarea name="internalNote" rows={3} />
          </Labelled>
        </Card>
        <Button className="md:max-w-[320px]">Add order</Button>
      </form>
    </>
  );
}
