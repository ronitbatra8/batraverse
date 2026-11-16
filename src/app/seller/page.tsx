import { redirect } from "next/navigation";

const PORTAL_URL =
  process.env.NEXT_PUBLIC_SELLER_PORTAL_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3001/seller"
    : "https://seller.batraverse.vercel.app");

export default function SellerRedirectPage() {
  redirect(PORTAL_URL);
}
