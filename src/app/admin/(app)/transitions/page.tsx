import { saveTransition } from "./actions";
import TransitionForm from "@/components/admin/transition-form";
import { Heading, Muted } from "@/components/admin/ui";
import { adminClient } from "@/lib/admin/sanity";
import { parseLoadingStyle } from "@/lib/loading-shared";
import { parseTransition } from "@/lib/page-transition-shared";
import { requireAdmin } from "@/lib/admin/session";

export default async function TransitionsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { saved } = await searchParams;
  const current = await adminClient().fetch<{ pageTransition?: Record<string, unknown>; loadingStyle?: string } | null>(`*[_id == "siteSettings"][0]{ pageTransition, loadingStyle }`);
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Page transitions</Heading>
        {saved ? <Muted>Saved. The shop uses it from the next page you open there.</Muted> : <Muted>How the shop moves from one page to the next, and how photos wait to load. The dashboard itself always fades.</Muted>}
      </div>
      <TransitionForm initial={parseTransition(current?.pageTransition)} initialLoading={parseLoadingStyle(current?.loadingStyle)} action={saveTransition} />
    </>
  );
}
