import Link from "next/link";
export default function Privacy() {
  return (
    <main className="privacy-page">
      <h1>About your Sounding workspace</h1>
      <p>
        Sounding is an independent educational recreation, not affiliated with Fathom. All sample
        meetings, people and content are fictional.
      </p>
      <p>
        Name-only registration creates an isolated temporary account lasting exactly 24 hours. The
        generated login ID is an internal identifier, not a mailbox. No real email is collected or
        sent. Passwords are stored only as salted secure hashes and displayed once at creation; they
        cannot be recovered.
      </p>
      <p>
        Temporary-account access, sessions and new sharing/media capabilities end at the original
        account deadline. Signing in again does not extend it. Existing established accounts are
        preserved.
      </p>
      <p>
        Physical deletion is separate from access expiry. A daily cleanup job is scheduled for 00:17
        UTC (05:17 Pakistan time). Free-tier execution may occur within that hour or be delayed. A
        minimum 15-minute grace period protects in-flight uploads. Storage failures are retried on
        later runs, so deletion may be delayed. Credentials, workspace data, transcripts and private
        media are deleted only after referenced storage objects are removed. A short object-key-only
        cleanup tombstone remains for repeat deletion over 48 hours.
      </p>
      <p>
        The separate public demo uses a workspace for each sign-in session. Signing out discards
        that demo workspace. Do not enter confidential information in demo content.
      </p>
      <p>
        Uploaded media remains protected. Uploads are limited to 24 MB, five minutes and three
        attempts per account per 24 hours. Paid AI processing is disabled by default and requires
        separate server-side approval and budget checks.
      </p>
      <p>
        Clip links are read-only and accessible to anyone with the link. New clip links can be
        revoked and cannot outlive a temporary account. Original legacy fictional snapshots expire
        at their encoded deadline. Already downloaded or buffered content cannot be recalled.
      </p>
      <Link href="/users/sign_in">Back to sign in</Link>
    </main>
  );
}
