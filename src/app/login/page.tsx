"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, UserPlus, CreditCard, MessageSquareText, KeyRound, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import {
  AuthShell,
  AuthHeading,
  AuthCard,
  Field,
  PasswordField,
  SubmitBtn,
  ErrorBanner,
  AuthFooter,
  Spinner,
  inputCls,
  headingGradCls,
  useLight,
} from "@/components/auth/auth-ui";
import { cn, errCode, errMessage } from "@/lib/utils";
import { apiUrl, apiFetch } from "@/lib/api";

const OWNER_EMAIL = "ronit_batra_08_11@gmail.com";
const OWNER_PHONE = "+91 90000 00001";

function redirectFor(user: { role?: string; email?: string; phone?: string }) {
  if (user.role === "DELIVERY") return "/delivery";
  if (user.role === "SELLER") return "/seller";
  if (user.email === OWNER_EMAIL || user.phone === OWNER_PHONE) return "/owner";
  return "/";
}

function LoginContent() {
  const router = useRouter();
  const { login, loginWithOtp, loginWithGoogleToken, enterAsGuest, updateUser } = useAuth();
  const searchParams = useSearchParams();
  const light = useLight();

  const [mode, setMode] = useState<"password" | "otp">("password");
  const [identifier, setIdentifier] = useState(searchParams.get("identifier") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [noAccount, setNoAccount] = useState("");
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNoAccount("");

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
        setNoAccount(id);
        setError("");
      } else {
        setError(errMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    setError("");
    setNoAccount("");

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
        setNoAccount(id);
        setError("");
      } else {
        setError(errMessage(err));
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
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: "password" | "otp") => {
    setMode(m);
    setError("");
    setNoAccount("");
    setOtpSent(false);
    setOtpCode("");
    setOtpInfo("");
  };

  return (
    <AuthShell>
      <AuthHeading
        eyebrow="Welcome"
        title={
          <>
            Sign <span className={headingGradCls(light)}>In</span>
          </>
        }
        subtitle="Sign in with your email, phone number, or card number."
      />

      <AuthCard>
        <ErrorBanner error={error} />
        {needPhone ? (
          <div
            className={cn(
              "rounded-xl border px-4 py-4",
              light ? "border-gold/40 bg-gold/5" : "border-gold/40 bg-gold/10"
            )}
          >
            <p className={cn("mb-1 text-sm font-semibold", light ? "text-onyx" : "text-cream")}>
              Almost done! ✳
            </p>
            <p className={cn("mb-3 text-xs", light ? "text-onyx/60" : "text-cream-dim")}>
              You're signed in with Google for the first time. Add your phone number for deliveries:
            </p>
            <input
              type="tel"
              inputMode="numeric"
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
                "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.3em] transition-all duration-300 disabled:opacity-50",
                light
                  ? "bg-gold text-onyx hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]"
                  : "bg-gold text-abyss hover:shadow-[0_0_30px_rgba(212,175,55,0.5)]"
              )}
            >
              {savingPhone ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        ) : googleError ? (
          <div
            className={cn(
              "mb-5 rounded-xl border px-4 py-3 text-sm",
              light ? "border-slate-300 bg-slate-50 text-slate-600" : "border-white/15 bg-white/5 text-cream-dim"
            )}
          >
            {googleError}
          </div>
        ) : null}

        {noAccount && (
          <div
            className={cn(
              "mb-5 rounded-xl border px-4 py-3",
              light ? "border-sapphire/25 bg-sapphire/5" : "border-gold/25 bg-gold/5"
            )}
          >
            <p className={cn("text-sm", light ? "text-sapphire" : "text-gold")}>
              No account found with these details.
            </p>
            <Link
              href={`/register?prefill=${encodeURIComponent(noAccount)}`}
              className={cn(
                "mt-2 inline-flex items-center gap-1.5 text-sm transition-colors",
                light ? "font-medium text-sapphire hover:text-sapphire-light" : "font-medium text-gold-light hover:text-gold"
              )}
            >
              <UserPlus size={14} /> Create account instead
            </Link>
          </div>
        )}

        {googleHandling ? (
          <div className="flex flex-col items-center justify-center gap-4 py-10">
            <Spinner />
            <p className={cn("text-sm", light ? "text-onyx/60" : "text-cream-dim")}>Completing Google sign-in...</p>
          </div>
        ) : (
          <form
            onSubmit={mode === "password" ? handlePasswordSubmit : otpSent ? handleOtpSubmit : handleSendOtp}
            className="space-y-5"
          >
            <Field
              label="Email, phone, or card number"
              icon={getIcon()}
            >
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setNoAccount("");
                  setError("");
                  setOtpSent(false);
                  setOtpCode("");
                }}
                placeholder="you@example.com, 98765 43210, or BV-ABCD-1234"
                autoFocus
                required
                className={inputCls(light)}
              />
            </Field>

            {mode === "password" && (
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
            )}

            {mode === "password" ? (
              <SubmitBtn loading={loading} loadingText="Signing in...">
                Sign In
              </SubmitBtn>
            ) : !otpSent ? (
              <SubmitBtn loading={loading} loadingText="Sending OTP...">
                Send OTP
              </SubmitBtn>
            ) : (
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
                  Sign In
                </SubmitBtn>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={resendIn > 0 || loading}
                  className={cn(
                    "mt-1 inline-flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50",
                    light ? "text-sapphire/80 hover:text-sapphire" : "text-gold/80 hover:text-gold-light"
                  )}
                >
                  <RefreshCw size={12} /> {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
                </button>
              </>
            )}

            <div
              className={cn("flex items-center gap-3", light ? "text-onyx/40" : "text-cream-dim/40")}
            >
              <span className="h-px flex-1 bg-current opacity-30" />
              <span className="text-[10px] uppercase tracking-[0.3em]">or</span>
              <span className="h-px flex-1 bg-current opacity-30" />
            </div>

            <div className={cn("flex rounded-full border p-1", light ? "border-onyx/15 bg-onyx/[0.02]" : "border-white/15 bg-white/[0.03]")}>
              {(["password", "otp"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={cn(
                    "flex-1 rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] transition-all duration-300",
                    mode === m
                      ? light
                        ? "bg-sapphire text-white shadow-sm"
                        : "bg-gold text-onyx shadow-sm"
                      : light
                        ? "text-onyx/50 hover:text-onyx"
                        : "text-cream-dim/50 hover:text-cream"
                  )}
                >
                  {m === "otp" ? "Use OTP" : "Use Password"}
                </button>
              ))}
            </div>

            {googleEnabled && (
              <a
                href={apiUrl("/auth/google")}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2.5 rounded-full border px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.3em] transition-all duration-500",
                  light
                    ? "border-onyx/15 bg-transparent text-onyx/70 hover:border-onyx/35 hover:shadow-md hover:text-slate-800"
                    : "border-white/15 bg-transparent text-cream/80 hover:border-white/40 hover:text-white"
                )}
              >
                <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                Continue with Google
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                enterAsGuest();
                router.push("/");
              }}
              className={cn(
                "mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.3em] transition-all duration-500",
                light
                  ? "border-onyx/15 bg-transparent text-onyx/60 hover:border-onyx/30 hover:text-onyx"
                  : "border-white/15 bg-transparent text-cream-dim/60 hover:border-white/30 hover:text-cream"
              )}
            >
              Explore as Guest
            </button>
          </form>
        )}
      </AuthCard>

      <AuthFooter text="Don't have an account?" linkText="Create one" href="/register" />
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
