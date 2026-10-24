"use client";
import { useState } from "react";
import { useWorkspace } from "./workspace-provider";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
export function AccountPanel({ emailEnabled }: { emailEnabled: boolean }) {
  const workspace = useWorkspace();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
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
        <dt>Account</dt>
        <dd>{profile.email}</dd>
        <dt>Workspace</dt>
        <dd>{profile.demo ? "Isolated demo visitor" : "Private account"}</dd>
        <dt>Session expires</dt>
        <dd>
          <time dateTime={profile.expiresAt}>{new Date(profile.expiresAt).toUTCString()}</time>
        </dd>
      </dl>
      <p>
        {profile.demo
          ? "Your changes are isolated to this sign-in session. Signing out removes this demo workspace. Shared demo credentials cannot be changed."
          : "Your meeting changes are saved to your private account and available across sign-in sessions."}
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
      {!profile.demo && (
        <p>
          <Link href="/forgot-password">Reset password</Link>
          {!emailEnabled &&
            " · Email delivery is not enabled yet. Google accounts recover through Google."}
        </p>
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
