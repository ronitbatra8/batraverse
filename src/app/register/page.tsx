"use client";

import { Fragment, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, KeyRound, Mail, Phone, User as UserIcon } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/Toast";
import {
  AuthShell,
  AuthCard,
  AuthFooter,
  ErrorBanner,
  Field,
  PasswordField,
  Spinner,
  dimTextCls,
  headingGradCls,
  inputCls,
  textCls,
  useLight,
} from "@/components/auth/auth-ui";
import { cn } from "@/lib/utils";
import { errMessage } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

type Step = 1 | 2 | 3;

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = searchParams.get("prefill") || "";
  const prefillIsEmail = prefill.includes("@");
  const { register } = useAuth();
  const light = useLight();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [role] = useState<"CUSTOMER">("CUSTOMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => (prefillIsEmail ? prefill : ""));
  const [phone, setPhone] = useState(() => (prefillIsEmail ? "" : prefill));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verifyToken, setVerifyToken] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  const normalizeEmail = (v: string) => v.trim().toLowerCase();
  const normalizePhone = (v: string) => {
    const cleaned = v.replace(/[\s\-()+.]+/g, "");
    return cleaned.startsWith("91") && cleaned.length === 12 ? cleaned.slice(2) : cleaned;
  };
  const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const phoneOk = (v: string) => /^[6-9]\d{9}$/.test(normalizePhone(v));

  const step1Ok = emailOk(email) && phoneOk(phone);
  const isVerified = Boolean(
    verifyToken && normalizeEmail(email) === verifiedEmail && normalizePhone(phone) === verifiedPhone
  );
  const step2Ok = name.trim().length >= 2 && password.length >= 6 && password === confirmPassword;

  const primaryBtnCls = cn(
    "inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-xl px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-all duration-500 disabled:cursor-not-allowed disabled:opacity-50 sm:px-8 sm:text-[11px] sm:tracking-[0.3em]",
    light
      ? "bg-sapphire text-white hover:shadow-[0_0_40px_rgba(30,58,138,0.35)]"
      : "bg-gold text-abyss hover:shadow-[0_0_40px_rgba(212,175,55,0.45)]"
  );
  const backBtnCls = cn(
    "text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors",
    light ? "text-sapphire hover:text-sapphire-light" : "text-gold hover:text-gold-light"
  );
  const panelCls = cn(
    "rounded-2xl border p-6",
    light ? "border-onyx/10 bg-white/80" : "border-white/5 bg-graphite"
  );
  const sectionLabelCls = cn(
    "text-[11px] font-semibold uppercase tracking-[0.3em]",
    light ? "text-dark-400" : "text-cream-dim/60"
  );

  const clearOtp = () => {
    setOtpSent(false);
    setOtpCode("");
    setOtpInfo("");
    setVerifyToken("");
    setVerifiedEmail("");
    setVerifiedPhone("");
  };

  const moveToStep = (n: Step) => {
    setStep(n);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goStep = (n: Step) => {
    if (n < step) {
      setError("");
      moveToStep(n);
    }
  };

  const updateEmail = (v: string) => {
    setError("");
    setEmail(v);
    clearOtp();
    if (step > 1) moveToStep(1);
  };

  const updatePhone = (v: string) => {
    setError("");
    setPhone(v);
    if (otpSent || verifyToken) clearOtp();
    if (step > 1) moveToStep(1);
  };

  const handleSendOtp = async () => {
    setError("");
    if (!emailOk(email)) {
      setError("Enter a valid email address");
      return;
    }
    if (!phoneOk(phone)) {
      setError("Enter a valid 10-digit Indian phone number");
      return;
    }
    setLoading(true);
    setOtpSent(false);
    setOtpCode("");
    setOtpInfo("");
    setVerifyToken("");
    setVerifiedEmail("");
    setVerifiedPhone("");
    try {
      const res = await apiFetch("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ email: normalizeEmail(email) }),
      });
      setOtpSent(true);
      setOtpInfo(res.message || `We sent a 6-digit code to ${normalizeEmail(email)}.`);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email: normalizeEmail(email), code: otpCode.trim() }),
      });
      if (!res.verifyToken) throw new Error("Verification failed. Please request a new code.");
      setVerifyToken(res.verifyToken);
      setVerifiedEmail(normalizeEmail(email));
      setVerifiedPhone(normalizePhone(phone));
      moveToStep(2);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ email: normalizeEmail(email) }),
      });
      setOtpCode("");
      setOtpInfo(res.message || `We sent a new code to ${normalizeEmail(email)}.`);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isVerified) {
      moveToStep(2);
      return;
    }
    if (!step1Ok) {
      setError("Enter a valid email and 10-digit phone number");
      return;
    }
    if (!otpSent) void handleSendOtp();
    else void handleVerifyOtp();
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!step2Ok) {
      if (name.trim().length < 2) setError("Name must be at least 2 characters");
      else if (password.length < 6) setError("Password must be at least 6 characters");
      else setError("Passwords do not match");
      return;
    }
    moveToStep(3);
  };

  const handleRegister = async () => {
    setError("");
    if (!isVerified) {
      setError("Verify your email before creating your account.");
      moveToStep(1);
      return;
    }
    if (!step2Ok) {
      setError("Complete your account details before continuing.");
      moveToStep(2);
      return;
    }
    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: normalizeEmail(email),
        phone: normalizePhone(phone),
        password,
        role,
        verifyToken,
      });
      router.replace("/");
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { n: 1 as Step, label: "Contact" },
    { n: 2 as Step, label: "Account" },
    { n: 3 as Step, label: "Review" },
  ];

  const reviewRows = [
    { label: "Email", value: normalizeEmail(email), edit: () => goStep(1) },
    { label: "Phone", value: `+91 ${normalizePhone(phone)}`, edit: () => goStep(1) },
    { label: "Full name", value: name.trim(), edit: () => goStep(2) },
    { label: "Password", value: "•".repeat(Math.min(password.length, 12)), edit: () => goStep(2) },
  ];

  return (
    <AuthShell maxW="max-w-6xl" topPad="pt-10 sm:pt-14">
      <div className="mb-8">
        <p className={cn("text-[9px] uppercase tracking-[0.5em]", light ? "text-sapphire" : "text-gold/80")}>
          Join the Verse
        </p>
        <h1 className={cn("mt-3 font-display text-4xl font-medium tracking-wide sm:text-5xl", textCls(light))}>
          Create <span className={headingGradCls(light)}>Account</span>
        </h1>
        <p className={cn("mt-3 text-sm leading-relaxed", dimTextCls(light))}>
          Three quick steps to start shopping on BATRAVERSE.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-3">
        {steps.map((s, i) => (
          <Fragment key={s.n}>
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-6 sm:w-14",
                  step >= s.n
                    ? light
                      ? "bg-sapphire"
                      : "bg-gold"
                    : light
                      ? "bg-dark-200"
                      : "bg-white/10"
                )}
              />
            )}
            <button
              type="button"
              onClick={() => goStep(s.n)}
              className={cn("flex items-center gap-2", s.n < step && "cursor-pointer")}
            >
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold transition-colors",
                  step >= s.n
                    ? light
                      ? "bg-sapphire text-white"
                      : "bg-gold text-abyss"
                    : light
                      ? "bg-dark-100 text-dark-400"
                      : "bg-white/10 text-cream-dim/50"
                )}
              >
                {s.n < step ? <Check size={12} /> : s.n}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.15em]",
                  step >= s.n
                    ? textCls(light)
                    : light
                      ? "text-dark-400"
                      : "text-cream-dim/40"
                )}
              >
                {s.label}
              </span>
            </button>
          </Fragment>
        ))}
      </div>

      <div className="grid gap-6 sm:gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AuthCard className="px-5 py-7 sm:px-8 sm:py-9">
            {step === 1 && (
              <div>
                <h2 className={sectionLabelCls}>1 — Contact Details</h2>
                <p className={cn("mt-3 text-sm", dimTextCls(light))}>
                  We&apos;ll send a one-time code to confirm this email address.
                </p>

                <div className="mt-6 space-y-5">
                  <ErrorBanner error={error} />

                  <Field label="Email" icon={<Mail size={16} strokeWidth={1.5} />}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      className={inputCls(light)}
                    />
                  </Field>

                  <Field label="Phone Number" icon={<Phone size={16} strokeWidth={1.5} />}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => updatePhone(e.target.value)}
                      placeholder="98765 43210"
                      autoComplete="tel"
                      required
                      className={inputCls(light)}
                    />
                  </Field>

                  {otpSent && !isVerified && (
                    <div
                      className={cn(
                        "space-y-4 rounded-xl border p-4",
                        light ? "border-sapphire/20 bg-sapphire/5" : "border-gold/20 bg-gold/5"
                      )}
                    >
                      {otpInfo && <p className={cn("text-xs leading-relaxed", dimTextCls(light))}>{otpInfo}</p>}
                      <Field label="6-digit code" icon={<KeyRound size={16} strokeWidth={1.5} />}>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="000000"
                          autoFocus
                          required
                          className={cn(inputCls(light), "tracking-[0.4em]")}
                        />
                      </Field>
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={loading}
                          className={cn("transition-colors disabled:opacity-50", light ? "text-sapphire hover:text-sapphire-light" : "text-gold hover:text-gold-light")}
                        >
                          {loading ? "Sending..." : "Resend code"}
                        </button>
                        <button type="button" onClick={clearOtp} className={cn("transition-colors", light ? "text-onyx/50 hover:text-onyx" : "text-dark-500 hover:text-cream")}>
                          Use a different email
                        </button>
                      </div>
                      <p className={cn("text-[11px] leading-relaxed", light ? "text-onyx/60" : "text-dark-500")}>
                        Didn&apos;t receive it? Check your Spam, Promotions, or All Mail folders.
                      </p>
                    </div>
                  )}

                  {isVerified && (
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-4",
                        light ? "border-emerald-500/25 bg-emerald-500/5" : "border-emerald-400/20 bg-emerald-400/5"
                      )}
                    >
                      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", light ? "bg-emerald-600 text-white" : "bg-emerald-500 text-abyss")}>
                        <Check size={14} />
                      </span>
                      <div>
                        <p className={cn("text-xs font-semibold", light ? "text-emerald-700" : "text-emerald-300")}>Email verified</p>
                        <p className={cn("mt-0.5 break-all text-xs", dimTextCls(light))}>{normalizeEmail(email)}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleStep1Submit}>
                    <button type="submit" disabled={loading} className={cn(primaryBtnCls, "mt-2 w-full")}>
                      {loading ? "Please wait..." : isVerified ? "Continue" : otpSent ? "Verify OTP" : "Send Verification Code"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className={sectionLabelCls}>2 — Account Details</h2>
                <p className={cn("mt-3 text-sm", dimTextCls(light))}>
                  Set the name and password you&apos;ll use to sign in.
                </p>

                <form onSubmit={handleStep2Submit} className="mt-6 space-y-5">
                  <ErrorBanner error={error} />

                  <Field label="Full Name" icon={<UserIcon size={16} strokeWidth={1.5} />}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setError("");
                        setName(e.target.value);
                      }}
                      placeholder="Your full name"
                      autoComplete="name"
                      autoFocus
                      required
                      className={inputCls(light)}
                    />
                  </Field>

                  <PasswordField
                    label="Create Password"
                    value={password}
                    onChange={(v) => {
                      setError("");
                      setPassword(v);
                    }}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                  />

                  <PasswordField
                    label="Confirm Password"
                    value={confirmPassword}
                    onChange={(v) => {
                      setError("");
                      setConfirmPassword(v);
                    }}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                  />

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center">
                    <button type="button" onClick={() => goStep(1)} className={cn(backBtnCls, "w-full py-2 sm:w-auto")}>
                      Back
                    </button>
                    <button type="submit" className={cn(primaryBtnCls, "flex-1")}>
                      Continue
                    </button>
                  </div>
                </form>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className={sectionLabelCls}>3 — Review &amp; Create</h2>
                <p className={cn("mt-3 text-sm", dimTextCls(light))}>
                  Check your details, then create your customer account.
                </p>

                <div className="mt-6 space-y-5">
                  <ErrorBanner error={error} />

                  <div className={cn("divide-y rounded-xl border", light ? "divide-dark-200/70 border-dark-200/70" : "divide-white/5 border-white/5")}>
                    {reviewRows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-4 p-4">
                        <div className="min-w-0">
                          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.2em]", light ? "text-dark-400" : "text-cream-dim/50")}>
                            {row.label}
                          </p>
                          <p className={cn("mt-1 break-all text-sm", textCls(light))}>{row.value}</p>
                        </div>
                        <button type="button" onClick={row.edit} className={cn(backBtnCls, "shrink-0")}>
                          Edit
                        </button>
                      </div>
                    ))}
                  </div>

                  <p className={cn("text-center text-[11px] leading-relaxed", light ? "text-onyx/60" : "text-dark-500")}>
                    By creating an account you agree to our terms and privacy policy.
                  </p>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                    <button type="button" onClick={() => goStep(2)} className={cn(backBtnCls, "w-full py-2 sm:w-auto")}>
                      Back
                    </button>
                    <button type="button" onClick={handleRegister} disabled={loading} className={cn(primaryBtnCls, "flex-1")}>
                      {loading ? "Creating account..." : "Create Account"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </AuthCard>
        </div>

        <aside className={panelCls}>
          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.3em]", light ? "text-sapphire" : "text-gold/80")}>
            Customer onboarding
          </p>
          <p className={cn("mt-3 text-sm leading-relaxed", dimTextCls(light))}>
            Complete these steps to create your customer account and start shopping on BATRAVERSE.
          </p>
          <div className={cn("mt-6 space-y-4 border-t pt-6", light ? "border-dark-200/70" : "border-white/5")}>
            {[
              { title: "Verify contact", body: "Confirm your email with a 6-digit code." },
              { title: "Secure account", body: "Choose your name and password." },
              { title: "Start shopping", body: "Your account is ready as soon as you finish." },
            ].map((item, i) => (
              <div key={item.title} className="flex gap-3">
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                    step >= i + 1
                      ? light
                        ? "bg-sapphire text-white"
                        : "bg-gold text-abyss"
                      : light
                        ? "bg-dark-100 text-dark-400"
                        : "bg-white/10 text-cream-dim/50"
                  )}
                >
                  {step > i + 1 ? <Check size={11} /> : i + 1}
                </span>
                <div>
                  <p className={cn("text-xs font-semibold", textCls(light))}>{item.title}</p>
                  <p className={cn("mt-1 text-[11px] leading-relaxed", dimTextCls(light))}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

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
