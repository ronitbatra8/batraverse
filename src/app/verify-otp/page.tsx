"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, KeyRound } from "lucide-react";
import {
  AuthShell,
  AuthHeading,
  AuthCard,
  Field,
  PasswordField,
  SubmitBtn,
  ErrorBanner,
  Spinner,
  inputCls,
  headingGradCls,
  useLight,
} from "@/components/auth/auth-ui";
import { apiFetch } from "@/lib/api";
import { cn, errMessage } from "@/lib/utils";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const light = useLight();

  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("bv-reset-identifier") || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: read the reset session identifier once, after mount
    setIdentifier(stored || searchParams.get("identifier") || "");
  }, [searchParams]);

  const handleResend = async () => {
    if (!identifier) {
      setError("Missing account identifier — please start again.");
      return;
    }
    setResending(true);
    setError("");
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier }),
      });
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code.trim()) {
      setError("Enter the 6-digit code");
      return;
    }
    if (!identifier) {
      setError("Missing account identifier — please start again.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/auth/verify-reset-code", {
        method: "POST",
        body: JSON.stringify({ identifier, code: code.trim() }),
      });
      setResetToken(res.resetToken);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ resetToken, newPassword }),
      });
      sessionStorage.removeItem("bv-reset-identifier");
      setDone(true);
      setTimeout(() => router.push("/login"), 1600);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell>
        <AuthHeading
          eyebrow="All set"
          title={
            <>
              Password <span className={headingGradCls(light)}>Updated</span>
            </>
          }
        />
        <AuthCard>
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/25 bg-gold/10">
              <Check size={22} className="text-gold-light" strokeWidth={1.5} />
            </div>
            <p className={cn("mt-4 text-sm", light ? "text-onyx/70" : "text-cream-dim")}>
              Your password has been changed. Sign in with your new password.
            </p>
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  if (resetToken) {
    return (
      <AuthShell>
        <AuthHeading
          eyebrow="One last step"
          title={
            <>
              New <span className={headingGradCls(light)}>Password</span>
            </>
          }
          subtitle="Choose a new password for your account."
        />
        <AuthCard>
          <ErrorBanner error={error} />
          <form onSubmit={handleNewPassword} className="space-y-5">
            <PasswordField
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Min. 6 characters"
              autoComplete="new-password"
            />
            <SubmitBtn loading={loading} loadingText="Updating...">
              Update Password
            </SubmitBtn>
          </form>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHeading
        eyebrow="Verify it's you"
        title={
          <>
            Enter <span className={headingGradCls(light)}>Code</span>
          </>
        }
        subtitle={`A 6-digit code was sent to your email${identifier ? "" : ""}.`}
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
              className={cn(inputCls(light), "tracking-[0.4em]")}
            />
          </Field>

          <SubmitBtn loading={loading} loadingText="Verifying...">
            Verify Code
          </SubmitBtn>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className={cn(
            "mt-5 w-full text-center text-xs transition-colors duration-300 disabled:opacity-50",
            light ? "text-onyx/50 hover:text-sapphire" : "text-dark-500 hover:text-gold"
          )}
        >
          {resending ? "Resending..." : "Didn't receive it? Resend the code"}
        </button>
        <p className={cn("mt-4 text-center text-[11px] leading-relaxed", light ? "text-onyx/60" : "text-dark-500")}>
          Not received yet? Check your <span className="font-medium">Spam</span>, <span className="font-medium">Promotions</span>, or <span className="font-medium">All Mail</span> folders — the code may have landed there.
        </p>
      </AuthCard>
    </AuthShell>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <VerifyOtpContent />
    </Suspense>
  );
}
