import Footer from "@/components/layout/Footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main
        className="relative z-10 min-h-screen pb-20 lg:pb-0"
        style={{ background: "var(--bg-page)" }}
      >
        {children}
      </main>
      <div style={{ height: "var(--footer-height, 0px)" }} />
      <Footer />
    </>
  );
}
