"use client";
import { useState, useEffect } from "react";
import { useWorkspace } from "./workspace-provider";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
export function AccountPanel() {
  const workspace = useWorkspace();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!workspace) return null;
  const { profile } = workspace;
  async function update(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const { error } = await authClient.updateUser({
      name: String(new FormData(event.currentTarget).get("name") ?? ""),
    });
    setMessage(error ? "Could not update your name. Please try again." : "Your name was updated.");
    setBusy(false);
    if (!error) window.location.reload();
  }
  async function logout() {
    setBusy(true);
    const { error } = await authClient.signOut();
    if (error) {
      setMessage("Could not sign out. Please try again.");
      setBusy(false);
    } else window.location.replace("/users/sign_in?reason=signed-out");
  }
  return (
    <main className="account-page">
      <Link href="/home">← My Calls</Link>
      <h1>Your account</h1>
      <dl>
        <dt>Name</dt>
        <dd>{profile.name}</dd>
        <dt>Login ID</dt>
        <dd>{profile.email}</dd>
        <dt>Workspace</dt>
        <dd>{profile.demo ? "Isolated demo visitor" : "Private account"}</dd>
        {profile.temporary && (
          <>
            <dt>Status</dt>
            <dd>Temporary account</dd>
            <dt>Created</dt>
            <dd>
              <time dateTime={profile.temporary.createdAt}>
                {new Date(profile.temporary.createdAt).toISOString()}
              </time>
            </dd>
            <dt>Account expires</dt>
            <dd>
              <time dateTime={profile.temporary.expiresAt}>
                {new Date(profile.temporary.expiresAt).toISOString()}
              </time>
            </dd>
            <dt>Remaining lifetime</dt>
            <dd>
              {Math.max(
                0,
                Math.ceil((new Date(profile.temporary.expiresAt).getTime() - now) / 60000),
              )}{" "}
              minutes
            </dd>
          </>
        )}
        <dt>Session expires</dt>
        <dd>
          <time dateTime={profile.expiresAt}>{new Date(profile.expiresAt).toUTCString()}</time>
        </dd>
      </dl>
      <p>
        {profile.demo
          ? "Your changes are isolated to this sign-in session. Signing out removes this demo workspace. Shared demo credentials cannot be changed."
          : profile.temporary
            ? "Your private workspace remains available across sign-in sessions until the original account deadline."
            : "Your meeting changes are saved to your established private account."}
      </p>
      {!profile.demo && (
        <form onSubmit={update}>
          <label>
            Display name
            <input name="name" defaultValue={profile.name} required maxLength={80} />
          </label>
          <button disabled={busy}>Save name</button>
        </form>
      )}
      {profile.temporary && (
        <>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(profile.email);
                setMessage("Login ID copied.");
              } catch {
                setMessage("Select and copy the login ID above.");
              }
            }}
          >
            Copy login ID
          </button>
          <p>
            Your password was displayed when your account was created. For security, it cannot be
            retrieved.
          </p>
          <p>
            Access expires at the account deadline. Physical cleanup runs daily with retries,
            starting at least 15 minutes after expiry; deletion can be delayed by scheduling or
            storage failures.
          </p>
        </>
      )}
      {message && <p role="status">{message}</p>}
      <button disabled={busy} onClick={logout}>
        Sign Out
      </button>
      <p>
        <Link href="/privacy">Privacy &amp; demo information</Link>
      </p>
    </main>
  );
}
