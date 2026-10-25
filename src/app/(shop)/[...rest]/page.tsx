import { notFound } from "next/navigation";

/** Any URL nothing else claims: renders the shop's own not-found page, inside the shop chrome. */
export default function CatchAll() {
  notFound();
}
