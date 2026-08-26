"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { useLight } from "@/components/auth/auth-ui";
import SiteLayout from "@/components/layout/SiteLayout";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/Toast";
import {
  Phone,
  Mail,
  Clock,
  MapPin,
  ChevronDown,
  Send,
  Building2,
  CheckCircle,
  LogIn,
} from "lucide-react";
import ContactAnimation from "@/components/ContactAnimation";

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TwitterIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function YoutubeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const contactInfo = [
  { icon: Phone, label: "Phone", value: "+91 90000 00001" },
  { icon: Mail, label: "Email", value: "hello@batraverse.com" },
  { icon: Clock, label: "Hours", value: "Mon – Sat, 10 AM – 8 PM IST" },
  { icon: MapPin, label: "Address", value: "Bengaluru, Karnataka, India" },
];

const stores = [
  {
    name: "Bengaluru Flagship",
    address: "123 Brigade Road, Bengaluru 560001",
    phone: "+91 90000 00001",
    hours: "Mon – Sat, 10 AM – 8 PM",
  },
  {
    name: "Mumbai Atelier",
    address: "45 Bandra West, Mumbai 400050",
    phone: "+91 90000 00002",
    hours: "Mon – Sat, 11 AM – 8 PM",
  },
  {
    name: "Delhi Studio",
    address: "67 Khan Market, New Delhi 110003",
    phone: "+91 90000 00003",
    hours: "Mon – Sat, 10 AM – 7 PM",
  },
];

const faqs = [
  {
    q: "How do I track my order?",
    a: "Once your order is dispatched, you will receive a tracking link via email and SMS. You can also view real-time status from your BatraVerse account under 'My Orders'.",
  },
  {
    q: "What is your return policy?",
    a: "We offer a 15-day return window on most items, provided they are unused and in original packaging. Bespoke and limited-edition pieces are final sale. Visit our Returns page for full details.",
  },
  {
    q: "Do you offer international shipping?",
    a: "Yes. We ship to over 30 countries worldwide. International orders typically arrive within 7–14 business days. Duties and taxes are calculated at checkout.",
  },
  {
    q: "How do I become a seller on BatraVerse?",
    a: "We curate our marketplace carefully. If you represent an artisan collective or luxury brand, submit an application through our Seller Portal. Our team reviews applications on a rolling basis.",
  },
  {
    q: "How do I contact support?",
    a: "You can reach us via the form on this page, email hello@batraverse.com, or call +91 90000 00001 during business hours. We aim to respond within 24 hours.",
  },
];

const socials = [
  { icon: InstagramIcon, label: "Instagram", href: "#" },
  { icon: TwitterIcon, label: "Twitter", href: "#" },
  { icon: LinkedinIcon, label: "LinkedIn", href: "#" },
  { icon: YoutubeIcon, label: "YouTube", href: "#" },
];

export default function ContactPage() {
  const light = useLight();
  const { toast } = useToast();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = data.get("name") as string;
    const email = data.get("email") as string;
    const altEmail = (data.get("altEmail") as string) || undefined;
    const subject = data.get("subject") as string;
    const message = data.get("message") as string;
    if (!name || !email || !subject || !message) {
      toast("Please fill in all required fields.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/messages", {
        method: "POST",
        body: JSON.stringify({ name, email, altEmail, subject, message }),
      });
      toast("Message sent. We'll be in touch shortly.", "success");
      setSubmitted(true);
    } catch (err: unknown) {
      toast((err instanceof Error ? err.message : null) || "Failed to send message", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
  };

  const inputCls = (disabled = false) =>
    cn(
      "w-full rounded-lg border px-5 py-3.5 text-sm outline-none transition-colors",
      disabled && "cursor-not-allowed",
      light
        ? disabled
          ? "bg-onyx/5 border-onyx/10 text-onyx/70"
          : "bg-white border-onyx/10 text-onyx placeholder:text-onyx/30 focus:border-sapphire/50"
        : disabled
          ? "bg-[#1a1a1f] border-gold/8 text-cream-dim/70"
          : "bg-[#1a1a1f] text-cream placeholder:text-cream-dim/30 focus:border-gold/50"
    );

  return (
    <SiteLayout>
      <section
        className={cn(
          "relative flex min-h-[65vh] items-center justify-center overflow-hidden",
          "bg-abyss text-cream"
        )}
      >
        <ContactAnimation />
        <div className="relative z-10 px-6 text-center">
          <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.6em] text-gold/70">
            We&rsquo;d Love to Hear From You
          </p>
          <h1
            className={cn(
              "font-display text-4xl font-medium tracking-wide sm:text-6xl md:text-8xl lg:text-9xl",
              "text-gold-gradient"
            )}
          >
            GET IN TOUCH
          </h1>
          <div className="mx-auto my-8 h-px w-24 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          <p className="mx-auto max-w-xl font-display text-xl font-light italic tracking-wide text-cream-dim sm:text-2xl">
            Every great relationship begins with a conversation
          </p>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-cream-dim/60">
            Whether you have a question about an order, a collaboration idea, or
            simply want to say hello — we are here for you.
          </p>
        </div>
      </section>

      <section className={cn("py-24 sm:py-32", light ? "bg-white" : "bg-[#111111]")}>
        <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2 lg:gap-20">
          <div>
            <p
              className={cn(
                "mb-4 text-[10px] font-semibold uppercase tracking-[0.5em]",
                light ? "text-sapphire" : "text-gold/70"
              )}
            >
              Send a Message
            </p>
            <h2
              className={cn(
                "mb-10 font-display text-3xl font-medium tracking-wide sm:text-4xl",
                light ? "text-onyx" : "text-cream"
              )}
            >
              Contact Form
            </h2>

            {submitted ? (
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl py-20 text-center",
                  light
                    ? "bg-[#f8f7f5] border border-onyx/5"
                    : "bg-[#0e0e11] border border-gold/8"
                )}
              >
                <div
                  className={cn(
                    "mb-6 flex h-20 w-20 items-center justify-center rounded-full transition-colors duration-500",
                    light
                      ? "bg-sapphire/10 text-sapphire"
                      : "bg-gold/10 text-gold"
                  )}
                >
                  <CheckCircle size={40} strokeWidth={1.5} />
                </div>
                <h3
                  className={cn(
                    "mb-3 font-display text-2xl font-medium tracking-wide",
                    light ? "text-onyx" : "text-cream"
                  )}
                >
                  Message Sent Successfully
                </h3>
                <p
                  className={cn(
                    "mb-10 max-w-sm text-sm leading-relaxed",
                    light ? "text-onyx/60" : "text-cream-dim/60"
                  )}
                >
                  Your query has been submitted. You&apos;ll receive updates via email.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/queries"
                    className={cn(
                      "inline-flex items-center justify-center rounded-full px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.3em] transition-all duration-500",
                      light
                        ? "bg-sapphire text-white hover:shadow-[0_0_50px_rgba(30,58,138,0.3)]"
                        : "bg-gold text-abyss hover:shadow-[0_0_50px_rgba(212,175,55,0.4)]"
                    )}
                  >
                    View in Queries
                  </Link>
                  <button
                    type="button"
                    onClick={resetForm}
                    className={cn(
                      "inline-flex items-center justify-center rounded-full px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.3em] transition-all duration-500 border",
                      light
                        ? "border-onyx/15 text-onyx hover:border-sapphire/40 hover:text-sapphire"
                        : "border-gold/15 text-cream hover:border-gold/40 hover:text-gold"
                    )}
                  >
                    Send Another
                  </button>
                </div>
              </div>
            ) : !user ? (
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl py-20 text-center",
                  light
                    ? "bg-[#f8f7f5] border border-onyx/5"
                    : "bg-[#0e0e11] border border-gold/8"
                )}
              >
                <div
                  className={cn(
                    "mb-6 flex h-20 w-20 items-center justify-center rounded-full transition-colors duration-500",
                    light
                      ? "bg-sapphire/10 text-sapphire"
                      : "bg-gold/10 text-gold"
                  )}
                >
                  <LogIn size={40} strokeWidth={1.5} />
                </div>
                <h3
                  className={cn(
                    "mb-3 font-display text-2xl font-medium tracking-wide",
                    light ? "text-onyx" : "text-cream"
                  )}
                >
                  Sign In Required
                </h3>
                <p
                  className={cn(
                    "mb-8 max-w-sm text-sm leading-relaxed",
                    light ? "text-onyx/60" : "text-cream-dim/60"
                  )}
                >
                  Please sign in to your account to get in touch with us. We&apos;ll
                  be able to assist you faster with a verified account.
                </p>
                <Link
                  href="/login"
                  className={cn(
                    "inline-flex items-center justify-center gap-3 rounded-full px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.3em] transition-all duration-500",
                    light
                      ? "bg-sapphire text-white hover:shadow-[0_0_50px_rgba(30,58,138,0.3)]"
                      : "bg-gold text-abyss hover:shadow-[0_0_50px_rgba(212,175,55,0.4)]"
                  )}
                >
                  Sign In
                  <LogIn size={15} strokeWidth={2} />
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className={cn(
                      "mb-2 block text-[11px] font-semibold uppercase tracking-[0.3em]",
                      light ? "text-onyx/60" : "text-cream-dim/60"
                    )}
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className={inputCls()}
                    style={{ borderWidth: 1 }}
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className={cn(
                      "mb-2 block text-[11px] font-semibold uppercase tracking-[0.3em]",
                      light ? "text-onyx/60" : "text-cream-dim/60"
                    )}
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    readOnly
                    value={user.email}
                    className={inputCls(true)}
                    style={{ borderWidth: 1 }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="altEmail"
                    className={cn(
                      "mb-2 block text-[11px] font-semibold uppercase tracking-[0.3em]",
                      light ? "text-onyx/60" : "text-cream-dim/60"
                    )}
                  >
                    Alternative Email{" "}
                    <span className={cn("font-normal", light ? "text-onyx/35" : "text-cream-dim/30")}>(optional)</span>
                  </label>
                  <input
                    id="altEmail"
                    name="altEmail"
                    type="email"
                    className={inputCls()}
                    style={{ borderWidth: 1 }}
                    placeholder="alternate@example.com"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className={cn(
                      "mb-2 block text-[11px] font-semibold uppercase tracking-[0.3em]",
                      light ? "text-onyx/60" : "text-cream-dim/60"
                    )}
                  >
                    Phone <span className={cn("font-normal", light ? "text-onyx/35" : "text-cream-dim/30")}>(optional)</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className={inputCls()}
                    style={{ borderWidth: 1 }}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
                <div>
                  <label
                    htmlFor="subject"
                    className={cn(
                      "mb-2 block text-[11px] font-semibold uppercase tracking-[0.3em]",
                      light ? "text-onyx/60" : "text-cream-dim/60"
                    )}
                  >
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    className={cn(
                      "w-full appearance-none rounded-lg border px-5 py-3.5 text-sm outline-none transition-colors",
                      light
                        ? "bg-white border-onyx/10 text-onyx focus:border-sapphire/50"
                        : "bg-[#1a1a1f] text-cream focus:border-gold/50"
                    )}
                    style={{ borderWidth: 1 }}
                  >
                    <option value="" disabled>Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="order">Order Support</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="partnership">Partnership</option>
                    <option value="feedback">Feedback</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className={cn(
                      "mb-2 block text-[11px] font-semibold uppercase tracking-[0.3em]",
                      light ? "text-onyx/60" : "text-cream-dim/60"
                    )}
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    className={cn(
                      "w-full resize-none rounded-lg border px-5 py-3.5 text-sm outline-none transition-colors",
                      light
                        ? "bg-white border-onyx/10 text-onyx placeholder:text-onyx/30 focus:border-sapphire/50"
                        : "bg-[#1a1a1f] text-cream placeholder:text-cream-dim/30 focus:border-gold/50"
                    )}
                    style={{ borderWidth: 1 }}
                    placeholder="Tell us how we can help..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "group flex w-full items-center justify-center gap-3 rounded-full px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.3em] transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed",
                    light
                      ? "bg-sapphire text-white hover:shadow-[0_0_50px_rgba(30,58,138,0.3)]"
                      : "bg-gold text-abyss hover:shadow-[0_0_50px_rgba(212,175,55,0.4)]"
                  )}
                >
                  {submitting ? "Sending..." : "Send Message"}
                  {!submitting && <Send
                    size={15}
                    strokeWidth={2}
                    className="transition-transform duration-500 group-hover:translate-x-0.5"
                  />}
                </button>
              </form>
            )}
          </div>

          <div>
            <p
              className={cn(
                "mb-4 text-[10px] font-semibold uppercase tracking-[0.5em]",
                light ? "text-sapphire" : "text-gold/70"
              )}
            >
              Reach Us Directly
            </p>
            <h2
              className={cn(
                "mb-10 font-display text-3xl font-medium tracking-wide sm:text-4xl",
                light ? "text-onyx" : "text-cream"
              )}
            >
              Contact Information
            </h2>
            <div className="space-y-5">
              {contactInfo.map((c) => (
                <div
                  key={c.label}
                  className={cn(
                    "group flex items-start gap-5 rounded-2xl p-6 transition-all duration-500",
                    light
                      ? "bg-white border border-onyx/5 hover:border-sapphire/20 hover:shadow-[0_8px_40px_rgba(30,58,138,0.08)]"
                      : "bg-[#0e0e11] border border-gold/8 hover:border-gold/25 hover:shadow-[0_8px_40px_rgba(212,175,55,0.06)]"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-500",
                      light
                        ? "bg-sapphire/8 text-sapphire group-hover:bg-sapphire group-hover:text-white"
                        : "bg-gold/10 text-gold group-hover:bg-gold group-hover:text-abyss"
                    )}
                  >
                    <c.icon size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-[0.3em]",
                        light ? "text-onyx/40" : "text-cream-dim/40"
                      )}
                    >
                      {c.label}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm leading-relaxed",
                        light ? "text-onyx" : "text-cream"
                      )}
                    >
                      {c.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className={cn(
          "py-24 sm:py-32",
          light
            ? "bg-gradient-to-b from-[#f4f1eb] to-white"
            : "bg-gradient-to-b from-[#111111] to-abyss"
        )}
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <p
              className={cn(
                "mb-4 text-[10px] font-semibold uppercase tracking-[0.5em]",
                light ? "text-sapphire" : "text-gold/70"
              )}
            >
              Visit Us
            </p>
            <h2
              className={cn(
                "font-display text-3xl font-medium tracking-wide sm:text-4xl",
                light ? "text-onyx" : "text-cream"
              )}
            >
              Store Locations
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <div
                key={store.name}
                className={cn(
                  "group relative rounded-2xl p-8 transition-all duration-500",
                  light
                    ? "bg-white border border-onyx/5 hover:border-sapphire/20 hover:shadow-[0_8px_40px_rgba(30,58,138,0.08)]"
                    : "bg-[#0e0e11] border border-gold/8 hover:border-gold/25 hover:shadow-[0_8px_40px_rgba(212,175,55,0.06)]"
                )}
              >
                <div
                  className={cn(
                    "mb-6 flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-500",
                    light
                      ? "bg-sapphire/8 text-sapphire group-hover:bg-sapphire group-hover:text-white"
                      : "bg-gold/10 text-gold group-hover:bg-gold group-hover:text-abyss"
                  )}
                >
                  <Building2 size={22} strokeWidth={1.5} />
                </div>
                <h3
                  className={cn(
                    "mb-4 font-display text-lg font-medium tracking-wide",
                    light ? "text-onyx" : "text-cream"
                  )}
                >
                  {store.name}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin
                      size={14}
                      strokeWidth={1.5}
                      className={cn("mt-0.5 shrink-0", light ? "text-onyx/35" : "text-cream-dim/40")}
                    />
                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        light ? "text-onyx/70" : "text-cream-dim/70"
                      )}
                    >
                      {store.address}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone
                      size={14}
                      strokeWidth={1.5}
                      className={cn("shrink-0", light ? "text-onyx/35" : "text-cream-dim/40")}
                    />
                    <p
                      className={cn(
                        "text-sm",
                        light ? "text-onyx/70" : "text-cream-dim/70"
                      )}
                    >
                      {store.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock
                      size={14}
                      strokeWidth={1.5}
                      className={cn("shrink-0", light ? "text-onyx/35" : "text-cream-dim/40")}
                    />
                    <p
                      className={cn(
                        "text-sm",
                        light ? "text-onyx/70" : "text-cream-dim/70"
                      )}
                    >
                      {store.hours}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cn("py-24 sm:py-32", light ? "bg-white" : "bg-[#111111]")}>
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-16 text-center">
            <p
              className={cn(
                "mb-4 text-[10px] font-semibold uppercase tracking-[0.5em]",
                light ? "text-sapphire" : "text-gold/70"
              )}
            >
              Support
            </p>
            <h2
              className={cn(
                "font-display text-3xl font-medium tracking-wide sm:text-4xl",
                light ? "text-onyx" : "text-cream"
              )}
            >
              Common Questions
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={cn(
                  "overflow-hidden rounded-2xl border transition-all duration-500",
                  light
                    ? "border-onyx/5 bg-[#f8f7f5]"
                    : "border-gold/8 bg-[#0e0e11]"
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className={cn(
                    "flex w-full items-center justify-between px-8 py-6 text-left transition-colors duration-300",
                    light ? "hover:bg-[#f0ede8]" : "hover:bg-[#131316]"
                  )}
                >
                  <span
                    className={cn(
                      "font-display text-sm font-medium tracking-wide sm:text-base",
                      light ? "text-onyx" : "text-cream"
                    )}
                  >
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={18}
                    strokeWidth={1.5}
                    className={cn(
                      "shrink-0 transition-transform duration-500",
                      light ? "text-onyx/40" : "text-cream-dim/40",
                      openFaq === i && "rotate-180"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-500",
                    openFaq === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <div
                      className={cn(
                        "px-8 pb-6 text-sm leading-relaxed",
                        light ? "text-onyx/60" : "text-cream-dim/70"
                      )}
                    >
                      {faq.a}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className={cn(
          "py-24 sm:py-32",
          light
            ? "bg-gradient-to-b from-[#f4f1eb] to-white"
            : "bg-gradient-to-b from-[#111111] to-abyss"
        )}
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p
            className={cn(
              "mb-4 text-[10px] font-semibold uppercase tracking-[0.5em]",
              light ? "text-sapphire" : "text-gold/70"
            )}
          >
            Stay Connected
          </p>
          <h2
            className={cn(
              "font-display text-3xl font-medium tracking-wide sm:text-4xl",
              light ? "text-onyx" : "text-cream"
            )}
          >
            Connect With Us
          </h2>
          <p
            className={cn(
              "mx-auto mt-5 max-w-md text-sm leading-relaxed",
              light ? "text-onyx/60" : "text-cream-dim/60"
            )}
          >
            Follow our journey and join the conversation across social media.
          </p>
          <div className="mx-auto mt-12 flex items-center justify-center gap-5">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-500",
                  light
                    ? "border-onyx/10 text-onyx/40 hover:border-sapphire hover:text-sapphire hover:shadow-[0_0_30px_rgba(30,58,138,0.15)]"
                    : "border-gold/10 text-cream-dim/40 hover:border-gold hover:text-gold hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]"
                )}
              >
                <s.icon size={20} />
              </a>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
