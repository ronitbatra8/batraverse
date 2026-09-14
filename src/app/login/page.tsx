"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, UserPlus, CreditCard, MessageSquareText, KeyRound, RefreshCw, Store, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import {
  AuthShell,
  AuthHeading,
  AuthCard,
  Field,
  PasswordField,
  SubmitBtn,
  Spinner,
  inputCls,
  headingGradCls,
  useLight,
} from "@/components/auth/auth-ui";
import { useToast } from "@/components/Toast";
import { cn, errCode, errMessage } from "@/lib/utils";
import { apiUrl, apiFetch } from "@/lib/api";
import { createPortal } from "react-dom";

const OWNER_EMAIL = "ronit_batra_08_11@gmail.com";
const OWNER_PHONE = "+91 90000 00001";

function redirectFor(user: { role?: string; email?: string; phone?: string }) {
  if (user.role === "DELIVERY") return "/delivery";
  if (user.role === "SELLER") return "/seller";
  if (user.email === OWNER_EMAIL || user.phone === OWNER_PHONE) return "/owner";
  return "/";
}

function actionBtnCls(variant: "primary" | "otp" | "create", light: boolean) {
  return cn(
    "inline-flex w-full items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.3em] whitespace-nowrap transition-all duration-500 disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" &&
      (light
        ? "bg-sapphire text-white hover:shadow-[0_0_40px_rgba(30,58,138,0.35)]"
        : "bg-gold text-abyss hover:shadow-[0_0_40px_rgba(212,175,55,0.45)]"),
    variant === "otp" &&
      (light
        ? "bg-slate-900 text-white hover:shadow-[0_0_40px_rgba(15,23,42,0.3)]"
        : "border border-gold/45 bg-gold/10 text-gold hover:bg-gold/20"),
    variant === "create" &&
      (light
        ? "bg-emerald-700 text-white hover:shadow-[0_0_40px_rgba(4,120,87,0.35)]"
        : "bg-emerald-800 text-white hover:shadow-[0_0_40px_rgba(6,95,70,0.4)]")
  );
}

function LoginContent() {
  const router = useRouter();
  const { login, loginWithOtp, loginWithGoogleToken, enterAsGuest, updateUser } = useAuth();
  const searchParams = useSearchParams();
  const light = useLight();
  const { toast } = useToast();

  const [checkState, setCheckState] = useState<"idle" | "checking" | "found" | "missing">("idle");
  const [identifier, setIdentifier] = useState(searchParams.get("identifier") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
  const [googleError, setGoogleError] = useState(searchParams.get("g_error") || "");
  const [googleHandling, setGoogleHandling] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [needPhone, setNeedPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const resendTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const toastMessage = error || phoneError || googleError;
  useEffect(() => {
    if (toastMessage) toast(toastMessage, "error");
  }, [toastMessage, toast]);

  const isEmailLike = (v: string) => /@/.test(v.trim());
  const isCardLike = (v: string) => /^[A-Za-z]{2,}-/.test(v.trim());

  const getIcon = () => {
    if (isCardLike(identifier)) return <CreditCard size={16} strokeWidth={1.5} />;
    if (isEmailLike(identifier)) return <Mail size={16} strokeWidth={1.5} />;
    return <Phone size={16} strokeWidth={1.5} />;
  };

  const clearResendTimer = () => {
    if (resendTimer.current) {
      clearInterval(resendTimer.current);
      resendTimer.current = null;
    }
  };

  useEffect(() => {
    apiFetch("/auth/google/config")
      .then((d) => setGoogleEnabled(!!d.enabled))
      .catch(() => setGoogleEnabled(false));
  }, []);

  useEffect(() => {
    const gToken = searchParams.get("g_token");
    const gNew = searchParams.get("g_new");
    if (gToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- start the Google handshake only after mount
      setGoogleHandling(true);
      loginWithGoogleToken(gToken)
        .then((user) => {
          if (gNew === "1") {
            setNeedPhone(true);
            setGoogleHandling(false);
          } else {
            router.push(redirectFor(user));
          }
        })
        .catch((err) => {
          setGoogleError(errMessage(err));
          setGoogleHandling(false);
        });
    }
    return clearResendTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSavePhone = async () => {
    setPhoneError("");
    const phone = newPhone.replace(/[^0-9]/g, "").slice(0, 10);
    if (phone.length !== 10) {
      setPhoneError("Enter your 10-digit phone number");
      return;
    }
    setSavingPhone(true);
    try {
      const user = await updateUser({ phone });
      router.push(redirectFor(user));
    } catch (err) {
      setPhoneError(errMessage(err));
    } finally {
      setSavingPhone(false);
    }
  };

  useEffect(() => {
    if (resendIn <= 0) {
      clearResendTimer();
      return;
    }
    if (!resendTimer.current) {
      resendTimer.current = setInterval(() => {
        setResendIn((s) => {
          if (s <= 1) {
            clearResendTimer();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return clearResendTimer;
  }, [resendIn]);

  const runAccountCheck = async (id: string) => {
    if (!id) {
      setError("Enter your email, phone number, or card number");
      setCheckState("idle");
      return;
    }
    if (/@/.test(id) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) {
      setError("Enter a valid email address");
      setCheckState("idle");
      return;
    }
    if (!/@/.test(id) && !/^[A-Za-z]{2,}-/.test(id) && !/^\d{10}$/.test(id.replace(/\s/g, ""))) {
      setError("Enter a valid phone number, email, or card number");
      setCheckState("idle");
      return;
    }
    setError("");
    setCheckState("checking");
    setOtpSent(false);
    setOtpCode("");
    setOtpInfo("");
    setPassword("");
    try {
      const res = await apiFetch("/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: id }),
      });
      setCheckState(res.exists ? "found" : "missing");
    } catch (err) {
      setError(errMessage(err));
      setCheckState("idle");
    }
  };

  const handleIdentifierChange = (v: string) => {
    setIdentifier(v);
    setCheckState("idle");
    setError("");
    setOtpSent(false);
    setOtpCode("");
    setOtpInfo("");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const id = identifier.trim();
    if (!id) {
      setError("Enter your email, phone number, or card number");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);
    try {
      const user = await login(id, password);
      router.push(redirectFor(user));
    } catch (err) {
      if (errCode(err) === "NOT_FOUND") {
        setCheckState("missing");
        setError("");
      } else {
        setError(errMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError("");

    const id = identifier.trim();
    if (!id) {
      setError("Enter your email, phone number, or card number");
      return;
    }

    setLoading(true);
    setOtpSent(false);
    setOtpCode("");
    setOtpInfo("");
    try {
      const res = await apiFetch("/auth/login/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: id }),
      });
      if (!res.maskedEmail) {
        throw Object.assign(new Error(res.error || "Could not send OTP"), { code: res.code });
      }
      setOtpSent(true);
      setOtpInfo(res.message || `OTP sent to ${res.maskedEmail}`);
      setResendIn(60);
    } catch (err) {
      if (errCode(err) === "NOT_FOUND") {
        setCheckState("missing");
        setError("");
      } else {
        setError(errMessage(err));
        setCheckState("checking");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otpCode.trim()) {
      setError("Enter the OTP sent to your email");
      return;
    }
    setLoading(true);
    try {
      const user = await loginWithOtp(identifier.trim(), otpCode.trim());
      router.push(redirectFor(user));
    } catch (err) {
      if (errCode(err) === "NOT_FOUND") {
        setCheckState("missing");
        setError("");
      } else {
        setError(errMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const id = identifier.trim();
    if (!id) {
      setError("Enter your email, phone number, or card number");
      return;
    }
    if (checkState === "missing") {
      return;
    }
    if (otpSent) {
      return handleOtpSubmit(e);
    }
    if (checkState !== "found") {
      return runAccountCheck(id);
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }
    return handlePasswordSubmit(e);
  };

  return (
    <AuthShell topPad="pt-2 sm:pt-3" className="login-ui !items-start">
      <AuthHeading
        title={
          <>
            Sign <span className={headingGradCls(light)}>In</span>
          </>
        }
        titleClassName="text-3xl sm:text-4xl"
        headingGap="mb-3"
      />

      <AuthCard>
        {googleError ? (
          <div
            className={cn(
              "mb-5 rounded-xl border px-4 py-3 text-sm",
              light ? "border-slate-300 bg-slate-50 text-slate-600" : "border-white/15 bg-white/5 text-cream-dim"
            )}
          >
            {googleError}
          </div>
        ) : null}

        {googleHandling ? (
          <div className="flex flex-col items-center justify-center gap-4 py-10">
            <Spinner />
            <p className={cn("text-sm", light ? "text-onyx/60" : "text-cream-dim")}>Completing Google sign-in...</p>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-5 sm:space-y-8">
            <Field
              label="Email, phone, or card number"
              icon={getIcon()}
            >
              <input
                type="text"
                value={identifier}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                placeholder="you@example.com, 98765 43210, or BV-ABCD-1234"
                autoFocus
                required
                className={inputCls(light)}
              />
            </Field>

            {checkState !== "found" && !otpSent && (
              <button
                type="submit"
                disabled={loading}
                onClick={
                  checkState === "missing"
                    ? () => router.push(`/register?prefill=${encodeURIComponent(identifier.trim())}`)
                    : undefined
                }
                className={cn(
                  "inline-flex w-full items-center justify-center gap-3 whitespace-nowrap rounded-xl px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.3em] transition-all duration-700 disabled:cursor-not-allowed disabled:opacity-50",
                  checkState === "missing"
                    ? light
                      ? "bg-emerald-700 text-white hover:shadow-[0_0_40px_rgba(4,120,87,0.35)]"
                      : "bg-emerald-800 text-white hover:shadow-[0_0_40px_rgba(6,95,70,0.4)]"
                    : light
                      ? "bg-sapphire text-white hover:shadow-[0_0_40px_rgba(30,58,138,0.35)]"
                      : "bg-gold text-abyss hover:shadow-[0_0_40px_rgba(212,175,55,0.45)]"
                )}
              >
                {checkState === "missing" ? (
                  <>
                    <UserPlus size={13} /> Create account
                  </>
                ) : loading ? (
                  "Checking..."
                ) : (
                  "Sign In"
                )}
              </button>
            )}

            {checkState === "found" && !otpSent && (
              <>
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  hint={
                    <Link
                      href="/forgot-password"
                      className={cn(
                        "text-[10px] font-medium uppercase tracking-wider transition-colors duration-300",
                        light ? "text-sapphire/80 hover:text-sapphire" : "text-gold/80 hover:text-gold-light"
                      )}
                    >
                      Forgot password?
                    </Link>
                  }
                />
                <SubmitBtn loading={loading} loadingText="Signing in...">
                  Sign In
                </SubmitBtn>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSendOtp}
                  className={actionBtnCls("otp", light)}
                >
                  Sign in with OTP
                </button>
              </>
            )}

            {checkState === "found" && otpSent && (
              <>
                {otpInfo && (
                  <p className={cn("-mt-1 flex items-center gap-1.5 text-xs", light ? "text-sapphire" : "text-gold")}>
                    <MessageSquareText size={13} /> {otpInfo}
                  </p>
                )}
                <Field label="One-time password (OTP)" icon={<KeyRound size={16} strokeWidth={1.5} />}>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6));
                      setError("");
                    }}
                    placeholder="6-digit code"
                    required
                    className={inputCls(light)}
                  />
                </Field>
                <SubmitBtn loading={loading} loadingText="Verifying...">
                  Verify & Sign In
                </SubmitBtn>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={resendIn > 0 || loading}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50",
                      light ? "text-sapphire/80 hover:text-sapphire" : "text-gold/80 hover:text-gold-light"
                    )}
                  >
                    <RefreshCw size={12} /> {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode("");
                      setOtpInfo("");
                    }}
                    className={cn(
                      "text-xs transition-colors",
                      light ? "text-onyx/50 hover:text-onyx" : "text-cream-dim/60 hover:text-cream"
                    )}
                  >
                    Use password instead
                  </button>
                </div>
              </>
            )}

            {checkState === "missing" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setCheckState("idle");
                    setError("");
                  }}
                  className={cn(
                    "text-xs transition-colors",
                    light ? "text-onyx/50 hover:text-onyx" : "text-cream-dim/60 hover:text-cream"
                  )}
                >
                  Try a different email
                </button>
              </div>
            )}

            {googleEnabled && (
              <a
                href={apiUrl("/auth/google")}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2.5 rounded-xl px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.3em] transition-all duration-500",
                  light
                    ? "bg-black text-white hover:opacity-85"
                    : "bg-white text-black hover:opacity-85"
                )}
              >
                <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                Google
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                enterAsGuest();
                router.push("/");
              }}
              className={cn(
                "group relative inline-flex w-full items-center rounded-xl p-[2px] transition-all duration-300",
                light
                  ? "bg-gradient-to-r from-sapphire-deep via-sapphire-light to-sapphire-deep"
                  : "bg-gradient-to-r from-gold-deep via-gold-light to-gold-deep"
              )}
            >
              <span
                className={cn(
                  "relative flex w-full items-center justify-between gap-3 rounded-[10px] py-3 pl-8 pr-3 transition-colors duration-300 group-hover:bg-gold group-hover:text-white",
                  light ? "bg-white" : "bg-abyss"
                )}
              >
                <span
                  className={cn(
                    "whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.3em] transition-colors duration-300 group-hover:text-white",
                    light ? "text-sapphire" : "text-gold-light"
                  )}
                >
                  Explore as Guest
                </span>
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    light ? "bg-sapphire text-white" : "bg-gradient-to-br from-gold-light to-gold-deep text-abyss"
                  )}
                >
                  <ArrowRight size={13} strokeWidth={2} />
                </span>
              </span>
            </button>

            {checkState !== "missing" && (
              <Link href="/register" className={actionBtnCls("create", light)}>
                <UserPlus size={13} /> Create account
              </Link>
            )}

            <Link href="/register?role=SELLER" className={actionBtnCls("create", light)}>
              <Store size={13} /> Create seller account
            </Link>
          </form>
        )}
      </AuthCard>

      {needPhone &&
        createPortal(
          <div className="fixed inset-0 z-[130]">
            <div
              className={cn(
                "absolute inset-0",
                light ? "bg-white/60" : "bg-abyss/70"
              )}
              style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
            />
            <div className="relative flex min-h-full items-center justify-center px-5 py-8">
              <div
                className={cn(
                  "w-full max-w-sm rounded-2xl border px-5 py-7 shadow-2xl animate-in zoom-in-95 fade-in duration-300",
                  light
                    ? "border-gold/40 bg-gradient-to-br from-white via-[#fdfdfb] to-[#f2efe7] shadow-gold/20"
                    : "border-gold/30 bg-gradient-to-br from-[#0e0e11] via-[#0a0a0d] to-[#050507] shadow-[0_20px_80px_rgba(0,0,0,0.7)]"
                )}
              >
                <div className="mb-5 text-center">
                  <p className={cn("mb-1 text-lg font-semibold", light ? "text-onyx" : "text-cream")}>
                    Almost done!
                  </p>
                  <p className={cn("text-xs", light ? "text-onyx/60" : "text-cream-dim")}>
                    You&apos;re signed in with your Google account for the first time.
                    <br />
                    Add a phone number so your orders can reach you:
                  </p>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoFocus
                  value={newPhone}
                  onChange={(e) => {
                    setNewPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10));
                    setPhoneError("");
                  }}
                  placeholder="10-digit phone number"
                  className={inputCls(light)}
                />
                {phoneError && (
                  <p
                    className={cn(
                      "mt-2 rounded-lg border px-3 py-2 text-xs",
                      light
                        ? "border-rose-500/30 bg-rose-500/5 text-rose-700"
                        : "border-rose-400/25 bg-rose-400/5 text-rose-300"
                    )}
                  >
                    {phoneError}
                  </p>
                )}
                <button
                  type="button"
                  disabled={savingPhone}
                  onClick={handleSavePhone}
                  className={cn(
                    "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.3em] transition-all duration-300 disabled:opacity-50",
                    light
                      ? "bg-gold text-onyx hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]"
                      : "bg-gold text-abyss hover:shadow-[0_0_30px_rgba(212,175,55,0.5)]"
                  )}
                >
                  {savingPhone ? "Saving..." : "Save & Continue"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginContent />
    </Suspense>
  );
}