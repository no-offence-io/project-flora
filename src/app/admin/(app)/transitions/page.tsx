import { saveTransition } from "./actions";
import TransitionForm from "@/components/admin/transition-form";
import { Heading, Muted } from "@/components/admin/ui";
import { adminClient } from "@/lib/admin/sanity";
import { parseTransition } from "@/lib/page-transition-shared";

export default async function TransitionsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const current = await adminClient().fetch<Record<string, unknown> | null>(`*[_id == "siteSettings"][0].pageTransition`);
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Page transitions</Heading>
        {saved ? <Muted>Saved. The shop uses it from the next page you open there.</Muted> : <Muted>How the shop moves from one page to the next. The dashboard itself always fades.</Muted>}
      </div>
      <TransitionForm initial={parseTransition(current)} action={saveTransition} />
    </>
  );
}
