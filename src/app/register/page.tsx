"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Mail, Phone, User as UserIcon } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/Toast";
import {
  AuthShell,
  AuthHeading,
  AuthCard,
  AuthFooter,
  Field,
  PasswordField,
  SubmitBtn,
  Spinner,
  inputCls,
  labelCls,
  linkCls,
  headingGradCls,
  useLight,
} from "@/components/auth/auth-ui";
import { cn } from "@/lib/utils";
import { errMessage } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = searchParams.get("prefill") || "";
  const prefillIsEmail = prefill.includes("@");
  const { register } = useAuth();
  const light = useLight();

  const [step, setStep] = useState<"form" | "otp">("form");
  const [role] = useState<"CUSTOMER">("CUSTOMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => (prefillIsEmail ? prefill : ""));
  const [phone, setPhone] = useState(() => (prefillIsEmail ? "" : prefill));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  const phoneOk = (v: string) => {
    const cleaned = v.replace(/[\s\-()+.]+/g, "");
    return (
      (cleaned.startsWith("91") && cleaned.length === 12
        ? /^[6-9]\d{9}$/.test(cleaned.slice(2))
        : /^[6-9]\d{9}$/.test(cleaned)) || (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned))
    );
  };

  const validateForm = () => {
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address";
    if (!phoneOk(phone)) return "Enter a valid 10-digit Indian phone number";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (confirmPassword !== password) return "Passwords do not match";
    return "";
  };

  const goAfterRegister = (_user: { role?: string }) => {
    router.push("/");
  };

  /* Step 1 — details, then send the email OTP */
  const handleDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const invalid = validateForm();
    if (invalid) {
      setError(invalid);
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });
      setStep("otp");
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  /* Step 2 — verify the code, then create the account */
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.replace(/[\s\-()+.]+/g, ""),
        password,
        role,
        verifyToken: res.verifyToken,
      });
      goAfterRegister(user);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);
    try {
      await apiFetch("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <AuthShell maxW="max-w-md sm:max-w-xl">
        <AuthHeading
          eyebrow="Verify your email"
          title={
            <>
              Enter <span className={headingGradCls(light)}>Code</span>
            </>
          }
          titleClassName="text-3xl sm:text-5xl"
          headingGap="mb-3"
        />
        <AuthCard>
          <form onSubmit={handleVerify} className="space-y-5">
            <Field label="6-digit code" icon={<KeyRound size={16} strokeWidth={1.5} />}>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                autoFocus
                required
                className={inputCls(light)}
              />
            </Field>
            <SubmitBtn loading={loading} loadingText="Verifying...">
              Verify
            </SubmitBtn>
          </form>
          <div className="mt-5 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className={cn(
                "transition-colors duration-300 disabled:opacity-50",
                light ? "text-onyx/50 hover:text-sapphire" : "text-dark-500 hover:text-gold"
              )}
            >
              {loading ? "Sending..." : "Resend code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setCode("");
                setError("");
              }}
              className={linkCls(light)}
            >
              Change email
            </button>
          </div>
          <p className={cn("mt-4 text-center text-[11px] leading-relaxed", light ? "text-onyx/60" : "text-dark-500")}>
            Didn&apos;t receive it? Check your <span className="font-medium">Spam</span>, <span className="font-medium">Promotions</span>, or <span className="font-medium">All Mail</span> folders — the code may have landed there.
          </p>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell maxW="max-w-md sm:max-w-xl">
      <AuthHeading
        eyebrow="Join the Verse"
        title={
          <>
            Create <span className={headingGradCls(light)}>Account</span>
          </>
        }
        titleClassName="text-3xl sm:text-5xl"
        headingGap="mb-3"
      />

      <AuthCard>
        <form onSubmit={handleDetails} className="space-y-5">
          <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 px-4 py-3 text-sm text-sky-300">
            Registering a customer account on BATRAVERSE.
          </div>

          <Field label="Full Name" icon={<UserIcon size={16} strokeWidth={1.5} />}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className={inputCls(light)}
            />
          </Field>

          <Field label="Email" icon={<Mail size={16} strokeWidth={1.5} />}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={inputCls(light)}
            />
          </Field>

          <Field label="Phone Number" icon={<Phone size={16} strokeWidth={1.5} />}>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
              required
              className={inputCls(light)}
            />
          </Field>

          <PasswordField
            label="Create Password"
            value={password}
            onChange={setPassword}
            placeholder="Min. 6 characters"
            autoComplete="new-password"
          />

          <PasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Repeat your password"
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "group relative mt-4 inline-flex w-full items-center rounded-xl p-[2px] transition-all duration-400 disabled:cursor-not-allowed",
              light
                ? "bg-gradient-to-r from-sapphire-deep via-sapphire-light to-sapphire-deep"
                : "bg-gradient-to-r from-gold-deep via-gold-light to-gold-deep"
            )}
          >
            <span
              className={cn(
                "relative flex w-full items-center justify-center gap-3 whitespace-nowrap rounded-[10px] py-3.5 text-[11px] font-semibold uppercase tracking-[0.3em] transition-colors duration-300 group-hover:bg-gold group-hover:text-white disabled:opacity-50",
                light ? "bg-white text-sapphire" : "bg-abyss text-gold-light"
              )}
            >
              {loading ? "Sending code..." : "Send Verification Code"}
            </span>
          </button>
        </form>
        <p className={cn("mt-4 text-center text-[10px]", light ? "text-onyx/40" : "text-dark-500")}>
          Your account opens only after the email code is verified.
        </p>
      </AuthCard>

      <AuthFooter text="Already have an account?" linkText="Sign in" href="/login" />
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <RegisterContent />
    </Suspense>
  );
}
