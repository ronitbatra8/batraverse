"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, UserPlus, CreditCard, Crown, Truck, Store, User as UserIcon } from "lucide-react";
import { useAuth, type User } from "@/components/auth/AuthContext";
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
  const addMode = searchParams.get("add") === "1";

  const [identifier, setIdentifier] = useState(searchParams.get("identifier") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [noAccount, setNoAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRoleChoice, setShowRoleChoice] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const isEmailLike = (v: string) => /@/.test(v.trim());
  const isCardLike = (v: string) => /^[A-Za-z]{2,}-/.test(v.trim());

  const getIcon = () => {
    if (isCardLike(identifier)) return <CreditCard size={16} strokeWidth={1.5} />;
    if (isEmailLike(identifier)) return <Mail size={16} strokeWidth={1.5} />;
    return <Phone size={16} strokeWidth={1.5} />;
  };

  const getRoleOptions = (u: User) => {
    const opts: { role: string; href: string; icon: typeof UserIcon; label: string; desc: string; accent: boolean }[] = [
      { role: "customer", href: "/", icon: UserIcon, label: "Shop as Customer", desc: "Browse products and place orders", accent: false },
    ];
    if (u.role === "DELIVERY") opts.push({ role: "delivery", href: "/delivery", icon: Truck, label: "Delivery Dashboard", desc: "View assigned orders and manage deliveries", accent: true });
    if (u.role === "SELLER") opts.push({ role: "seller", href: "/seller", icon: Store, label: "Seller Dashboard", desc: "Manage your products and listings", accent: true });
    if (u.email === OWNER_EMAIL || u.phone === OWNER_PHONE) opts.push({ role: "owner", href: "/owner", icon: Crown, label: "Owner Dashboard", desc: "Manage orders, users and products", accent: true });
    return opts;
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
      const user = await login(id, password, addMode);
      if (addMode) {
        router.push("/");
        return;
      }
      if (user.role === "DELIVERY") {
        router.push("/delivery");
      } else if (user.role === "SELLER") {
        router.push("/seller");
      } else {
        const opts = getRoleOptions(user);
        if (opts.length > 1) {
          setPendingUser(user);
          setShowRoleChoice(true);
        } else {
          router.push("/");
        }
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

  if (showRoleChoice && pendingUser) {
    const opts = getRoleOptions(pendingUser);
    const isOwner = pendingUser.email === OWNER_EMAIL || pendingUser.phone === OWNER_PHONE;
    const name = pendingUser.name?.split(" ")[0] || "User";

    return (
      <AuthShell>
        <AuthHeading
          eyebrow={`Welcome ${isOwner ? "Ronit" : name}`}
          title={
            <>
              Choose <span className={headingGradCls(light)}>Access</span>
            </>
          }
          subtitle="How would you like to continue?"
        />
        <div className="space-y-3">
          {opts.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.role}
                type="button"
                onClick={() => router.push(opt.href)}
                className={cn(
                  "w-full rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-0.5",
                  opt.accent
                    ? light
                      ? "border-sapphire/25 bg-white hover:border-sapphire/50 hover:shadow-[0_16px_40px_rgba(30,58,138,0.10)]"
                      : "border-gold/25 bg-white/[0.03] hover:border-gold/50 hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
                    : light
                      ? "border-black/10 bg-white hover:border-sapphire/30 hover:shadow-[0_16px_40px_rgba(30,58,138,0.10)]"
                      : "border-white/10 bg-white/[0.03] hover:border-gold/30 hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
                )}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border transition-colors",
                      opt.accent
                        ? light
                          ? "border-sapphire/25 bg-sapphire/10 text-sapphire"
                          : "border-gold/25 bg-gold/10 text-gold-light"
                        : light
                          ? "border-black/10 bg-onyx/[0.04] text-onyx/60"
                          : "border-white/10 bg-white/[0.03] text-cream-dim"
                    )}
                  >
                    <Icon size={24} strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-base font-semibold",
                        opt.accent
                          ? light ? "text-sapphire" : "text-gold-light"
                          : light ? "text-onyx" : "text-cream"
                      )}
                    >
                      {opt.label}
                    </span>
                    <span
                      className={cn(
                        "mt-1 block text-sm",
                        light ? "text-onyx/50" : "text-cream-dim/60"
                      )}
                    >
                      {opt.desc}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHeading
        eyebrow={addMode ? "Add Account" : "Welcome"}
          title={
            <>
              Sign <span className={headingGradCls(light)}>In</span>
            </>
          }
        subtitle={addMode ? "Sign in to a new account to add it." : "Sign in with your email, phone number, or card number."}
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
            {addMode ? "Add Account" : "Sign In"}
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
