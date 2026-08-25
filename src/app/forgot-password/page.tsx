"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import {
  AuthShell,
  AuthHeading,
  AuthCard,
  Field,
  SubmitBtn,
  ErrorBanner,
  AuthFooter,
  Spinner,
  inputCls,
  headingGradCls,
  useLight,
} from "@/components/auth/auth-ui";
import { apiFetch } from "@/lib/api";
import { cn, errMessage } from "@/lib/utils";

function ForgotPasswordContent() {
  const router = useRouter();
  const light = useLight();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSentTo("");

    const id = identifier.trim();
    if (!id) {
      setError("Enter your email or phone number");
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
    const cleaned = id.replace(/[\s\-()+.]+/g, "");
    const phoneOk =
      (cleaned.startsWith("91") && cleaned.length === 12
        ? /^[6-9]\d{9}$/.test(cleaned.slice(2))
        : /^[6-9]\d{9}$/.test(cleaned)) || (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned));
    if (!emailOk && !phoneOk) {
      setError("Enter a valid email address or 10-digit Indian phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier: id }),
      });
      sessionStorage.setItem("bv-reset-identifier", id);
      setSentTo(res.maskedEmail || res.identifier || "");
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <AuthShell>
        <AuthHeading
          eyebrow="Check your email"
          title={
            <>
              Code <span className={headingGradCls(light)}>Sent</span>
            </>
          }
          subtitle={`A 5-minute verification code was sent to ${sentTo}.`}
        />
        <AuthCard>
          <div className="flex flex-col items-center py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/25 bg-gold/10">
              <KeyRound size={22} className="text-gold-light" strokeWidth={1.5} />
            </div>
            <p className={cn("mt-4 text-sm leading-relaxed", light ? "text-onyx/70" : "text-cream-dim")}>
              Enter the code on the next screen to reset your password. Check your
              spam folder if it doesn&apos;t arrive in a minute.
            </p>
            <button
              type="button"
              onClick={() => router.push("/verify-otp?mode=reset")}
              className="group mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-gold px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-abyss transition-all duration-500 hover:shadow-[0_0_40px_rgba(212,175,55,0.45)]"
            >
              Enter the code
              <ArrowRight
                size={15}
                strokeWidth={1.5}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </button>
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHeading
        eyebrow="Recover access"
        title={
          <>
            Forgot <span className={headingGradCls(light)}>Password</span>
          </>
        }
        subtitle="Enter the email or phone on your account and we'll send a one-time code to your email."
      />

      <AuthCard>
        <ErrorBanner error={error} />

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Email or phone">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or 98765 43210"
              autoFocus
              required
              className={cn(inputCls(light), "pl-4")}
            />
          </Field>

          <SubmitBtn loading={loading} loadingText="Sending code...">
            Send Verification Code
          </SubmitBtn>
        </form>
      </AuthCard>

      <AuthFooter text="Remembered it?" linkText="Sign in" href="/login" />
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
