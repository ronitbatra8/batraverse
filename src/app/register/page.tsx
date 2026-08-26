"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Mail, Phone, Store, Truck, User as UserIcon } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import {
  AuthShell,
  AuthHeading,
  AuthCard,
  AuthFooter,
  Field,
  PasswordField,
  SubmitBtn,
  ErrorBanner,
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

const ROLES = [
  { value: "CUSTOMER", label: "Customer", desc: "Browse and shop", icon: UserIcon },
  { value: "SELLER", label: "Seller", desc: "List your products", icon: Store },
  { value: "DELIVERY", label: "Delivery", desc: "Deliver orders", icon: Truck },
] as const;

const maskEmail = (e: string) => e.replace(/^(.)(.*)(@.*)$/, "$1***$3");

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = searchParams.get("prefill") || "";
  const prefillIsEmail = prefill.includes("@");
  const { register } = useAuth();
  const light = useLight();

  const [step, setStep] = useState<"form" | "otp">("form");
  const [role, setRole] = useState<"CUSTOMER" | "SELLER" | "DELIVERY">("CUSTOMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => (prefillIsEmail ? prefill : ""));
  const [phone, setPhone] = useState(() => (prefillIsEmail ? "" : prefill));
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    return "";
  };

  const goAfterRegister = (user: { role?: string }) => {
    if (user.role === "SELLER" || user.role === "DELIVERY") {
      router.push("/dashboard");
    } else {
      router.push("/");
    }
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
      <AuthShell>
        <AuthHeading
          eyebrow="Verify your email"
          title={
            <>
              Enter <span className={headingGradCls(light)}>Code</span>
            </>
          }
          subtitle={`A 6-digit verification code was sent to ${maskEmail(email.trim())}. We need to confirm your email before creating the account.`}
        />
        <AuthCard>
          <ErrorBanner error={error} />
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
              Verify &amp; Create Account
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
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHeading
        eyebrow="Join the Verse"
        title={
          <>
            Create <span className={headingGradCls(light)}>Account</span>
          </>
        }
        subtitle="Open your Batra Verse account. A one-time code will be sent to your email to confirm it."
      />

      <AuthCard>
        <ErrorBanner error={error} />

        <form onSubmit={handleDetails} className="space-y-5">
          <div>
            <label className={labelCls(light)}>I want to join as</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const active = role === r.value;
                return (
                  <button
                    type="button"
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs transition-all",
                      active
                        ? light
                          ? "border-sapphire/40 bg-sapphire/10 text-sapphire"
                          : "border-gold/40 bg-gold/10 text-gold-light"
                        : light
                          ? "border-onyx/15 bg-onyx/[0.03] text-onyx/60 hover:border-onyx/30"
                          : "border-dark-700 bg-dark-800/50 text-dark-400 hover:border-dark-600"
                    )}
                  >
                    <Icon size={18} strokeWidth={1.5} />
                    <span className="font-medium">{r.label}</span>
                    <span
                      className={cn("text-[9px]", light ? "text-onyx/40" : "text-dark-500")}
                    >
                      {r.desc}
                    </span>
                  </button>
                );
              })}
            </div>
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

          <SubmitBtn loading={loading} loadingText="Sending code...">
            Send Verification Code
          </SubmitBtn>
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
