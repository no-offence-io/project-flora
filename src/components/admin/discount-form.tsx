import { deleteDiscount, saveDiscount } from "@/app/admin/(app)/actions";
import { Button, Card, Checkbox, Input, Labelled, Muted, Select, Subheading } from "@/components/admin/ui";
import { oreToKroner } from "@/lib/admin/sanity";


export type DiscountDoc = {
  _id: string;
  code?: string;
  description?: string;
  kind?: "percent" | "amount" | "shipping";
  value?: number;
  freeShipping?: boolean;
  active?: boolean;
  startsAt?: string;
  endsAt?: string;
  minSubtotalOre?: number | null;
  maxUses?: number | null;
  uses?: number;
};

/** For <input type="datetime-local">: local wall time without seconds. */
const local = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function DiscountForm({ discount }: { discount: DiscountDoc | null }) {
  const d = discount;
  const kind = d?.kind ?? "percent";
  return (
    <form action={saveDiscount} className="flex max-w-[860px] flex-col gap-[42px]">
      {d && <input type="hidden" name="id" value={d._id} />}
      <Card>
        <Subheading>Code</Subheading>
        <div className="h-px w-full bg-black/25" />
        <div className="flex flex-col gap-[24px]">
          <div className="flex flex-col gap-[24px] md:flex-row">
            <Labelled label="Code" hint="What the customer types. Saved in capitals." className="flex-1">
              <Input name="code" defaultValue={d?.code ?? ""} required pattern="[A-Za-z0-9-]{2,30}" className="uppercase" />
            </Labelled>
            <Labelled label="Internal note" className="flex-1">
              <Input name="description" defaultValue={d?.description ?? ""} placeholder="e.g. Instagram launch" />
            </Labelled>
          </div>
          <div className="flex flex-col gap-[24px] md:flex-row">
            <Labelled label="Type" className="flex-1">
              <Select name="kind" defaultValue={kind}>
                <option value="percent">Percent off</option>
                <option value="amount">Amount off (kr)</option>
                <option value="shipping">Free shipping only</option>
              </Select>
            </Labelled>
            <Labelled label="Value" hint="Percent (e.g. 10) or kroner (e.g. 100). Not used for free shipping." className="flex-1">
              <Input name="value" inputMode="decimal" defaultValue={kind === "amount" ? oreToKroner(d?.value) : String(d?.value ?? "")} />
            </Labelled>
          </div>
          <Checkbox name="freeShipping" label="Also free shipping" defaultChecked={d?.freeShipping === true} />
          <Checkbox name="active" label="Active" defaultChecked={d ? d.active !== false : true} />
        </div>
      </Card>
      <Card>
        <Subheading>Limits</Subheading>
        <div className="h-px w-full bg-black/25" />
        <div className="flex flex-col gap-[24px]">
          <div className="flex flex-col gap-[24px] md:flex-row">
            <Labelled label="Valid from" hint="Leave empty for now." className="flex-1"><Input name="startsAt" type="datetime-local" defaultValue={local(d?.startsAt)} /></Labelled>
            <Labelled label="Valid until" hint="Leave empty for no end." className="flex-1"><Input name="endsAt" type="datetime-local" defaultValue={local(d?.endsAt)} /></Labelled>
          </div>
          <div className="flex flex-col gap-[24px] md:flex-row">
            <Labelled label="Minimum order (kr)" hint="Leave empty for none." className="flex-1"><Input name="minSubtotal" inputMode="decimal" defaultValue={oreToKroner(d?.minSubtotalOre)} /></Labelled>
            <Labelled label="Maximum uses" hint="Leave empty for unlimited." className="flex-1"><Input name="maxUses" type="number" min={1} step={1} defaultValue={d?.maxUses ?? ""} /></Labelled>
          </div>
          {d && <Muted>Used {d.uses ?? 0} times so far.</Muted>}
        </div>
      </Card>
      <div className="flex flex-col gap-[12px] md:max-w-[320px]">
        <Button>{d ? "Save" : "Create code"}</Button>
        {d && (
          <button type="submit" formAction={deleteDiscount} className="font-gotham text-paragraph text-black/50 underline hover:text-black transition-colors">
            Delete this code
          </button>
        )}
      </div>
    </form>
  );
}
