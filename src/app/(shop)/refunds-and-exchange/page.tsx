import PolicyPage, { policyMetadata } from "@/components/policy-page";

export const generateMetadata = () => policyMetadata("refunds-and-exchange");

export default function Page() {
  return <PolicyPage page="refunds-and-exchange" />;
}
