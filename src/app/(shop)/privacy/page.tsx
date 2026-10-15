import type { Metadata } from "next";
import PolicyPage from "@/components/policy-page";
import { getPolicyPage } from "@/data/policies";

const page = getPolicyPage("privacy")!;

export const metadata: Metadata = { title: `${page.title} – Flöra` };

export default function Page() {
  return <PolicyPage page={page} />;
}
