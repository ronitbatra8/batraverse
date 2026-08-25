import Footer from "@/components/layout/Footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main
        className="relative z-10 min-h-screen"
        style={{ background: "var(--bg-page)" }}
      >
        {children}
      </main>
      <div style={{ height: "var(--footer-height, 0px)" }} />
      <Footer />
    </>
  );
}
