"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AudioLines, ArrowRight, Play, ShieldCheck, Globe } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { safeReturnPath } from "@/lib/http-security";
export type AuthMode = "login" | "signup" | "email" | "forgot" | "reset";
type Issued = { loginId: string; password: string; createdAt: string; expiresAt: string };
export function AuthScreen({
  mode,
  next,
  reason,
}: {
  mode: AuthMode;
  next?: string;
  reason?: string;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [issued, setIssued] = useState<Issued | null>(null),
    [reveal, setReveal] = useState(false);
  const submitting = useRef(false);
  const destination = safeReturnPath(next);
  useEffect(() => {
    const discard = () => {
      setIssued(null);
      setReveal(false);
    };
    window.addEventListener("pagehide", discard);
    window.addEventListener("pageshow", discard);
    return () => {
      window.removeEventListener("pagehide", discard);
      window.removeEventListener("pageshow", discard);
    };
  }, []);
  async function demo() {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/demo", { method: "POST" });
      if (!r.ok) throw new Error();
      window.location.assign(destination);
    } catch {
      setMessage("The demo is temporarily unavailable. Please try again.");
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      if (mode === "signup") {
        const r = await fetch("/api/temporary-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: String(data.get("name") ?? "").trim() }),
        });
        if (!r.ok) {
          const result = await r.json();
          setMessage(result.message ?? "Could not create an account.");
        } else setIssued(await r.json());
      } else {
        const { error } = await authClient.signIn.email({
          email: String(data.get("email") ?? "")
            .trim()
            .toLowerCase(),
          password: String(data.get("password") ?? ""),
          callbackURL: destination,
        });
        if (error)
          setMessage(
            "We couldn't sign you in. Check your login ID and password. Temporary accounts expire after 24 hours.",
          );
        else {
          window.location.assign(destination);
          return;
        }
      }
    } catch {
      setMessage("Unable to connect. Please try again.");
    }
    submitting.current = false;
    setBusy(false);
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied. Keep your credentials private.");
    } catch {
      setMessage("Clipboard unavailable. Select and copy the displayed value.");
    }
  }
  function download() {
    if (!issued) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          `Sounding temporary account\nLogin ID: ${issued.loginId}\nPassword: ${issued.password}\nExpires: ${issued.expiresAt}\nKeep this file private. Passwords cannot be recovered.\n`,
        ],
        { type: "text/plain;charset=utf-8" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "sounding-temporary-credentials.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const recovery = mode === "forgot" || mode === "reset";
  return (
    <main className="auth-page">
      <Link className="auth-brand" href="/users/sign_in">
        SOUNDING <AudioLines size={27} />
      </Link>
      <div className="auth-composition">
        <section className="auth-card" aria-labelledby="auth-heading">
          <h1 id="auth-heading">
            {issued
              ? "Your temporary account is ready"
              : mode === "signup"
                ? "Create a temporary account"
                : recovery
                  ? "Password recovery unavailable"
                  : mode === "email"
                    ? "Sign in with your login ID"
                    : "Sign in to Sounding"}
          </h1>
          {issued ? (
            <div className="auth-form auth-credentials">
              <p className="auth-notice">
                You are signed in. This is the only time your password is available. Save your
                credentials before continuing.
              </p>
              <label>
                Login ID
                <input aria-label="Generated login ID" readOnly value={issued.loginId} />
              </label>
              <button className="auth-provider" onClick={() => copy(issued.loginId)}>
                Copy login ID
              </button>
              <label>
                Generated password
                <input
                  aria-label="Generated password"
                  autoComplete="off"
                  readOnly
                  type={reveal ? "text" : "password"}
                  value={issued.password}
                />
              </label>
              <div className="journey-controls">
                <button onClick={() => setReveal(!reveal)}>
                  {reveal ? "Hide password" : "Reveal password"}
                </button>
                <button onClick={() => copy(issued.password)}>Copy password</button>
              </div>
              <p>
                Expires:{" "}
                <time dateTime={issued.expiresAt}>{new Date(issued.expiresAt).toUTCString()}</time>
              </p>
              <button className="auth-provider" onClick={download}>
                Download credentials
              </button>
              <p className="auth-config-note">
                The downloaded file contains your password. Keep it private. No password copy is
                retained by Sounding.
              </p>
              <button
                className="auth-primary"
                onClick={() => {
                  setIssued(null);
                  setReveal(false);
                  window.location.replace(
                    `/users/sign_up/confirm-personal-email?next=${encodeURIComponent(destination)}`,
                  );
                }}
              >
                Continue to setup <ArrowRight size={17} />
              </button>
            </div>
          ) : recovery ? (
            <>
              <p className="auth-notice">
                Password recovery is currently unavailable. Temporary accounts expire after 24
                hours. If you lose your credentials, create a new temporary account.
              </p>
              <Link className="auth-provider" href="/users/sign_up">
                Create account
              </Link>
              <button className="auth-provider auth-demo" disabled={busy} onClick={demo}>
                <Play size={17} />
                Try the public demo
              </button>
            </>
          ) : (
            <>
              {reason && (
                <p className="auth-notice" role="status">
                  {reason === "signed-out"
                    ? "You have been signed out."
                    : "Your session or temporary account has expired. Sign in again or create a new account."}
                </p>
              )}
              {mode === "signup" && (
                <p className="auth-notice">
                  Your account and workspace expire after 24 hours. Save your login credentials if
                  you want to return before then. No real email address is needed.
                </p>
              )}
              {mode === "login" ? (
                <div className="auth-providers">
                  <button className="auth-provider auth-provider-static" disabled>
                    <span className="google-mark" aria-hidden="true">
                      G
                    </span>
                    Continue with Google
                  </button>
                  <button className="auth-provider auth-provider-static" disabled>
                    <span className="microsoft-mark" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                    Continue with Microsoft
                  </button>
                  <button className="auth-provider auth-provider-static" disabled>
                    <Globe size={19} />
                    Continue with SSO
                  </button>
                  <p className="auth-config-note">
                    Provider sign-in is unavailable in this demo. Use your login ID or create a
                    temporary account.
                  </p>
                  <Link
                    className="auth-provider"
                    href={`/users/sign_in/email?next=${encodeURIComponent(destination)}`}
                  >
                    Continue with login ID
                  </Link>
                  <Link className="auth-provider" href="/users/sign_up">
                    Create account
                  </Link>
                </div>
              ) : (
                <form className="auth-form" onSubmit={submit}>
                  {mode === "signup" ? (
                    <label>
                      Your name
                      <input name="name" autoComplete="name" required maxLength={80} />
                    </label>
                  ) : (
                    <>
                      <label>
                        Login ID
                        <input
                          name="email"
                          type="text"
                          autoComplete="username"
                          required
                          maxLength={254}
                          placeholder="Your generated login ID"
                        />
                      </label>
                      <label>
                        Password
                        <input
                          name="password"
                          type="password"
                          autoComplete="current-password"
                          required
                          maxLength={128}
                        />
                      </label>
                      <Link className="auth-forgot" href="/forgot-password">
                        Forgot password?
                      </Link>
                    </>
                  )}
                  <button className="auth-primary" disabled={busy}>
                    {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log In"}
                    <ArrowRight size={17} />
                  </button>
                </form>
              )}
              <button className="auth-provider auth-demo" disabled={busy} onClick={demo}>
                <Play size={17} />
                Try the public demo
              </button>
              <p className="auth-config-note">
                Instant access without credentials. Demo changes stay separate from other visitors
                and are discarded on sign-out.
              </p>
            </>
          )}
          {message && (
            <p className="auth-notice" role="status">
              {message}
            </p>
          )}
          <p className="auth-switch">
            <Link href={mode === "login" ? "/users/sign_up" : "/users/sign_in"}>
              {mode === "login" ? "Create a temporary account" : "Back to sign in"}
            </Link>
          </p>
          <p className="auth-policy">
            An independent educational demo. Sample meeting content is fictional.
            <br />
            <Link href="/privacy">Privacy &amp; demo information</Link>
          </p>
        </section>
        <aside className="auth-story">
          <p>
            Be present for the conversation.
            <br />
            <strong>Remember what matters.</strong>
          </p>
          <span>Your meetings. Your workspace.</span>
          <small>
            Temporary account access ends after 24 hours. Physical cleanup runs daily and may be
            delayed if storage is unavailable.
          </small>
        </aside>
      </div>
      <footer className="auth-trust">
        <span>
          <ShieldCheck size={18} />
          Server-side sessions
        </span>
        <span>Isolated workspaces</span>
        <span>Passwords stored as secure hashes</span>
      </footer>
    </main>
  );
}
