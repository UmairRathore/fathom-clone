import Link from "next/link";
export default function Privacy() {
  return (
    <main className="privacy-page">
      <h1>About your Sounding workspace</h1>
      <p>
        Sounding is an independent educational recreation and is not affiliated with Fathom. Sample
        meetings, speakers, and content are fictional.
      </p>
      <p>
        Private account details, server sessions, and your meeting changes are stored in PostgreSQL.
        Passwords are hashed by Better Auth. Google sign-in requests identity information only. No
        calendar or conferencing account is connected.
      </p>
      <p>
        The public demo creates a separate workspace for each sign-in session. It expires after 24
        hours; signing out discards that visitor workspace. Do not add personal or confidential
        information to demo content.
      </p>
      <p>
        Share links are read-only snapshots, accessible to anyone with the link for 24 hours.
        Changing future sharing settings does not revoke previously issued links. Never share
        confidential content through a public demo.
      </p>
      <Link href="/users/sign_in">Back to sign in</Link>
    </main>
  );
}
