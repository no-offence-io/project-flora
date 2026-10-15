import { deleteFaq, saveFaq } from "@/app/admin/(app)/actions";
import { Bilingual, Button, Card, Input, Labelled } from "@/components/admin/ui";
import { getBlocksText, getText, type LocalizedBlocks, type LocalizedString } from "@/lib/admin/localized";

export type FaqDoc = { _id: string; question?: LocalizedString; answer?: LocalizedBlocks; order?: number };

export default function FaqForm({ item }: { item: FaqDoc | null }) {
  return (
    <form action={saveFaq} className="flex max-w-[860px] flex-col gap-[42px]">
      {item && <input type="hidden" name="id" value={item._id} />}
      <Card>
        <div className="flex flex-col gap-[24px]">
          <Bilingual name="question" label="Question" en={getText(item?.question, "en")} no={getText(item?.question, "no")} required />
          <Bilingual name="answer" label="Answer" en={getBlocksText(item?.answer, "en")} no={getBlocksText(item?.answer, "no")} multiline rows={6} />
          <Labelled label="Position" hint="Lower numbers show first.">
            <Input name="order" type="number" defaultValue={item?.order ?? 100} className="md:max-w-[160px]" />
          </Labelled>
        </div>
      </Card>
      <div className="flex flex-col gap-[12px] md:max-w-[320px]">
        <Button>{item ? "Save" : "Add question"}</Button>
        {item && (
          <button type="submit" formAction={deleteFaq} className="font-gotham text-paragraph text-black/50 underline hover:text-black transition-colors">
            Delete this question
          </button>
        )}
      </div>
    </form>
  );
}
