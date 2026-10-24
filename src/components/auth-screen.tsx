"use client";
import Link from "next/link";
import { useState } from "react";
import {
  AudioLines,
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  Mail,
  Play,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { safeReturnPath } from "@/lib/http-security";
export type AuthMode = "login" | "signup" | "email" | "forgot" | "reset";
export function AuthScreen({
  mode,
  google,
  emailEnabled,
  next,
  reason,
  validToken = true,
}: {
  mode: AuthMode;
  google: boolean;
  emailEnabled: boolean;
  next?: string;
  reason?: string;
  validToken?: boolean;
}) {
  const [busy, setBusy] = useState(""),
    [message, setMessage] = useState(""),
    [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const destination = safeReturnPath(next);
  const title = {
    login: "Sign in to Sounding",
    signup: "Sign up for Sounding",
    email: "Sign in with email",
    forgot: "Reset your password",
    reset: "Choose a new password",
  }[mode];
  async function demo() {
    setBusy("demo");
    setMessage("");
    try {
      const response = await fetch("/api/demo", { method: "POST" });
      if (!response.ok) throw new Error("The demo is temporarily unavailable. Please try again.");
      window.location.assign(destination);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not sign in.");
      setBusy("");
    }
  }
  async function googleSignIn() {
    setBusy("google");
    setMessage("");
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: destination,
        errorCallbackURL: "/users/sign_in?reason=oauth",
      });
      if (error) throw new Error();
    } catch {
      setMessage("Google sign-in could not be started. Please try again.");
      setBusy("");
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("submit");
    setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? ""),
      password = String(data.get("password") ?? "");
    try {
      if (mode === "email") {
        const { error } = await authClient.signIn.email({
          email,
          password,
          callbackURL: destination,
        });
        if (error) {
          setMessage(
            "We couldn't sign you in. Check your email and password, or verify your email first.",
          );
        } else {
          window.location.assign(destination);
          return;
        }
      } else if (mode === "signup") {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: String(data.get("name") ?? ""),
          callbackURL: "/users/sign_in",
        });
        if (error)
          setMessage("Unable to create this account. Check your details or try signing in.");
        else {
          setSuccess(true);
          setMessage("Check your email to verify your account, then sign in.");
        }
      } else if (mode === "forgot") {
        const { error } = await authClient.requestPasswordReset({
          email,
          redirectTo: "/reset-password",
        });
        if (error) setMessage("Password reset is temporarily unavailable. Please try again later.");
        else {
          setSuccess(true);
          setMessage(
            "If this address has a password account, a reset link will arrive shortly. The link expires in 15 minutes.",
          );
        }
      } else if (mode === "reset") {
        // Read the token only into memory; never print, persist or include it in screenshots.
        const token = new URLSearchParams(window.location.search).get("token") ?? "";
        const { error } = await authClient.resetPassword({ newPassword: password, token });
        if (error) setMessage("This reset link is invalid or expired. Request a new link.");
        else {
          setSuccess(true);
          setMessage("Your password has been reset. Sign in with your new password.");
          window.history.replaceState(null, "", "/reset-password");
        }
      }
    } catch {
      setMessage("Unable to connect. Please try again.");
    }
    setBusy("");
  }
  const form = mode !== "login" && (mode !== "signup" || emailEnabled);
  return (
    <main className="auth-page">
      <Link className="auth-brand" href="/users/sign_in" aria-label="Sounding sign in">
        SOUNDING <AudioLines size={27} strokeWidth={3} />
      </Link>
      <div className="auth-composition">
        <section className="auth-card" aria-labelledby="auth-heading">
          {mode === "signup" && (
            <span className="auth-rocket" aria-hidden="true">
              🚀
            </span>
          )}
          <h1 id="auth-heading">{title}</h1>
          {mode === "signup" && (
            <p className="auth-subtitle">Connect your work email to get started in minutes</p>
          )}
          {mode === "forgot" && (
            <p className="auth-subtitle">
              For email and password accounts. Google accounts recover access through Google.
            </p>
          )}
          {mode === "reset" && (
            <p className="auth-subtitle">
              Use at least 12 characters. Resetting signs out your other sessions.
            </p>
          )}
          {reason && (
            <p className="auth-notice" role="status">
              {reason === "oauth"
                ? "Google sign-in was not completed. Please try again."
                : reason === "signed-out"
                  ? "You have been signed out."
                  : "Your session has ended. Sign in to continue."}
            </p>
          )}
          {(mode === "login" || mode === "signup") && (
            <>
              <div className="auth-providers">
                <button
                  className="auth-provider"
                  onClick={googleSignIn}
                  disabled={!!busy || !google}
                >
                  {busy === "google" ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : (
                    <span className="google-mark" aria-hidden="true">
                      G
                    </span>
                  )}
                  Continue with Google
                </button>
                {!google && (
                  <p className="auth-config-note">
                    Google sign-in will be available once configured.
                  </p>
                )}
                {mode === "login" && (
                  <>
                    <Link
                      className="auth-provider"
                      href={`/users/sign_in/email?next=${encodeURIComponent(destination)}`}
                    >
                      <Mail size={18} />
                      Continue with email
                    </Link>
                    <button className="auth-provider auth-demo" disabled={!!busy} onClick={demo}>
                      {busy === "demo" ? (
                        <LoaderCircle className="spin" size={18} />
                      ) : (
                        <Play size={17} />
                      )}
                      Try the public demo
                    </button>
                    <p className="auth-config-note">
                      No account needed. Your demo changes stay separate from other visitors.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
          {mode === "signup" && !emailEnabled && (
            <p className="auth-notice">
              Email account creation is not enabled yet.{" "}
              <Link href="/users/sign_in">Try the public demo</Link> while private sign-in is
              configured.
            </p>
          )}
          {form && !success && (
            <form className="auth-form" onSubmit={submit}>
              {mode === "signup" && (
                <label>
                  Your name
                  <input name="name" autoComplete="name" required maxLength={80} />
                </label>
              )}
              {mode !== "reset" && (
                <label>
                  Email Address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    maxLength={254}
                    disabled={(mode === "forgot" || mode === "signup") && !emailEnabled}
                  />
                </label>
              )}
              {(mode === "email" || mode === "signup" || mode === "reset") && (
                <label>
                  Password
                  <div className="password-field">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={mode === "email" ? 1 : 12}
                      maxLength={128}
                      autoComplete={mode === "email" ? "current-password" : "new-password"}
                      disabled={mode === "reset" && (!emailEnabled || !validToken)}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
              )}
              {mode === "email" && (
                <Link className="auth-forgot" href="/forgot-password">
                  Forgot password?
                </Link>
              )}
              {(mode === "forgot" || mode === "signup" || mode === "reset") && !emailEnabled && (
                <p className="auth-notice">
                  Email delivery is not enabled yet. Use the public demo{google ? " or Google" : ""}{" "}
                  to continue.
                </p>
              )}
              {mode === "reset" && !validToken && (
                <p className="auth-notice">
                  This reset link is invalid or expired. Request a new link.
                </p>
              )}
              <button
                className="auth-primary"
                disabled={
                  !!busy ||
                  ((mode === "forgot" || mode === "signup" || mode === "reset") && !emailEnabled) ||
                  (mode === "reset" && !validToken)
                }
              >
                {busy === "submit" ? (
                  <LoaderCircle size={18} className="spin" />
                ) : mode === "signup" ? (
                  "Create account"
                ) : mode === "forgot" ? (
                  "Send reset link"
                ) : mode === "reset" ? (
                  "Reset password"
                ) : (
                  "Log In"
                )}
                <ArrowRight size={17} />
              </button>
            </form>
          )}
          {message && (
            <p
              className={success ? "auth-success" : "auth-error"}
              role={success ? "status" : "alert"}
            >
              {message}
            </p>
          )}
          <p className="auth-switch">
            {mode === "login" ? (
              <>
                New to Sounding? <Link href="/users/sign_up">Sign up</Link>
              </>
            ) : mode === "signup" ? (
              <>
                Already have a Sounding account? <Link href="/users/sign_in">Sign in</Link>
              </>
            ) : (
              <Link href="/users/sign_in">
                <ArrowLeft size={15} /> Back to Login
              </Link>
            )}
          </p>
          <p className="auth-policy">
            An independent educational demo. All sample meeting content is fictional.
            <br />
            <Link href="/privacy">Privacy &amp; demo information</Link>
          </p>
        </section>
        <aside className="auth-story">
          <span className="auth-quote" aria-hidden="true">
            “
          </span>
          <p>
            Be present for the conversation.
            <br />
            <strong>Remember what matters.</strong>
          </p>
          <span>Your meetings. Your workspace.</span>
          <div className="auth-story-line" />
          <small>Review recordings, find decisions, and turn conversations into next steps.</small>
        </aside>
      </div>
      <footer className="auth-trust">
        <span>
          <ShieldCheck size={18} /> Server-side sessions
        </span>
        <span>Private workspaces</span>
        <span>Read-only sharing</span>
        <span>Independent assessment project</span>
      </footer>
    </main>
  );
}
