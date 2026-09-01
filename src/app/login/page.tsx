"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, UserPlus, CreditCard } from "lucide-react";
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

const OWNER_EMAIL = "ronit_batra_08_11@gmail.com";
const OWNER_PHONE = "+91 90000 00001";

function LoginContent() {
  const router = useRouter();
  const { login, enterAsGuest } = useAuth();
  const searchParams = useSearchParams();
  const light = useLight();

  const [identifier, setIdentifier] = useState(searchParams.get("identifier") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [noAccount, setNoAccount] = useState("");
  const [loading, setLoading] = useState(false);

  const isEmailLike = (v: string) => /@/.test(v.trim());
  const isCardLike = (v: string) => /^[A-Za-z]{2,}-/.test(v.trim());

  const getIcon = () => {
    if (isCardLike(identifier)) return <CreditCard size={16} strokeWidth={1.5} />;
    if (isEmailLike(identifier)) return <Mail size={16} strokeWidth={1.5} />;
    return <Phone size={16} strokeWidth={1.5} />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      if (user.role === "DELIVERY") {
        router.push("/delivery");
      } else if (user.role === "SELLER") {
        router.push("/seller");
      } else if (user.email === OWNER_EMAIL || user.phone === OWNER_PHONE) {
        router.push("/owner");
      } else {
        router.push("/");
      }
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

        <form onSubmit={handleSubmit} className="space-y-5">
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
              }}
              placeholder="you@example.com, 98765 43210, or BV-ABCD-1234"
              autoFocus
              required
              className={inputCls(light)}
            />
          </Field>

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

          <div className={cn("mt-1 text-center", light ? "text-onyx/50" : "text-cream-dim/50")}>
            <span className="text-[10px] uppercase tracking-[0.3em]">or</span>
          </div>

          <button
            type="button"
            onClick={() => {
              enterAsGuest();
              router.push("/");
            }}
            className={cn(
              "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.3em] transition-all duration-500",
              light
                ? "border-onyx/15 bg-transparent text-onyx/60 hover:border-onyx/30 hover:text-onyx"
                : "border-white/15 bg-transparent text-cream-dim/60 hover:border-white/30 hover:text-cream"
            )}
          >
            Explore as Guest
          </button>
        </form>
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
