import type { Metadata } from "next";
import { Playfair_Display, Manrope } from "next/font/google";
import Providers from "@/components/Providers";
import SiteWrapper from "@/components/SiteWrapper";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BATRAVERSE — Shop Everything",
  description:
    "BATRAVERSE — a marketplace for everything. Shop electronics, fashion, home, groceries and more from trusted sellers, all in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-abyss font-sans">
        <Providers>
          <SiteWrapper>{children}</SiteWrapper>
        </Providers>
      </body>
    </html>
  );
}
