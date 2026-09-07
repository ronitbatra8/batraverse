import { redirect } from "next/navigation";

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const amt = typeof sp.amount === "string" ? sp.amount : "";
  redirect(amt ? `/cards?amount=${encodeURIComponent(amt)}` : "/cards");
}