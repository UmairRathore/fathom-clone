"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AudioLines, Check, ChevronDown, Monitor, UserCircle, Users, Video } from "lucide-react";
import { authClient } from "@/lib/auth-client";
export type OnboardingStep = "personal" | "preferences" | "role" | "zoom" | "download";
const roles = [
  "Sales",
  "Customer Success",
  "Product / Design",
  "Marketing",
  "Operations",
  "Engineering",
  "Other",
];
export function OnboardingFlow({
  step,
  name,
  destination,
}: {
  step: OnboardingStep;
  name: string;
  destination: string;
}) {
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const link = (path: string) => `${path}?next=${encodeURIComponent(destination)}`;
  const progress = { personal: 20, preferences: 50, role: 67, zoom: 86, download: 96 }[step];
  async function signOut() {
    setBusy(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      window.location.replace("/users/sign_in?reason=signed-out");
    } catch {
      setError("Could not sign out. Please try again.");
      setBusy(false);
    }
  }
  return (
    <main className={`onboarding-page onboarding-${step}`}>
      {step !== "personal" && (
        <div
          className="onboarding-progress"
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      <Link className="auth-brand" href="/home">
        SOUNDING <AudioLines size={27} />
      </Link>
      <section className="onboarding-content" aria-labelledby="onboarding-heading">
        {step === "personal" && (
          <>
            <header className="onboarding-intro">
              <h1 id="onboarding-heading">
                <span>How will you use Sounding?</span>
                <br />
                Start with your personal workspace.
              </h1>
              <p>Your temporary account is ready. No work email is required.</p>
            </header>
            <div className="onboarding-cards">
              <article className="onboarding-card">
                <UserCircle className="onboarding-card-icon" size={42} />
                <h2>Personal use only</h2>
                <p>Suited for your own calls</p>
                <ul className="onboarding-features">
                  <li>View and organize your own meetings</li>
                  <li>Keep your workspace private</li>
                  <li>Temporary access for 24 hours</li>
                </ul>
                <Link
                  className="onboarding-button onboarding-secondary"
                  href={link("/onboarding/customize/auto_record")}
                >
                  Continue with Personal Workspace
                </Link>
              </article>
              <article className="onboarding-card onboarding-team">
                <span className="onboarding-badge">RECOMMENDED</span>
                <div className="onboarding-team-icons">
                  <UserCircle size={40} />
                  <Users size={40} />
                </div>
                <h2>Individual or Team use</h2>
                <p>Team features &amp; shared insights</p>
                <ul className="onboarding-features checked">
                  <li>
                    <Check />
                    Set individual and team preferences
                  </li>
                  <li>
                    <Check />
                    Create private and shared workspaces
                  </li>
                  <li>
                    <Check />
                    Add teammates anytime
                  </li>
                </ul>
                <button className="onboarding-button onboarding-filled" disabled>
                  Continue with Work Email
                </button>
                <small>Team setup is unavailable in this assessment demo.</small>
              </article>
            </div>
          </>
        )}
        {step === "preferences" && (
          <>
            <p className="onboarding-eyebrow">SET UP YOUR PREFERENCES</p>
            <h1 id="onboarding-heading" className="onboarding-preferences">
              Take notes on{" "}
              <span className="onboarding-select">
                <select aria-label="Recording preference" disabled value="manual">
                  <option value="manual">Don&apos;t automate. I&apos;ll capture manually</option>
                </select>
                <ChevronDown size={18} />
              </span>{" "}
              and share with{" "}
              <span className="onboarding-select">
                <select aria-label="Sharing preference" disabled value="private">
                  <option value="private">Only me</option>
                </select>
                <ChevronDown size={18} />
              </span>
            </h1>
            <label className="onboarding-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                I understand I&apos;m responsible for collecting attendee consent for the recording
                and transcription, in accordance with applicable laws.
              </span>
            </label>
            <button
              className="onboarding-button onboarding-outline onboarding-continue"
              disabled={!consent}
              onClick={() => router.push(link("/signup/questionnaire/personal/role"))}
            >
              Continue
            </button>
            <p className="onboarding-note">
              Manual capture only. No calendar connection or automatic sharing is enabled.
            </p>
          </>
        )}
        {step === "role" && (
          <>
            <p className="onboarding-eyebrow">PERSONALIZE YOUR ACCOUNT</p>
            <h1 id="onboarding-heading">What best describes your job function?</h1>
            <div className="onboarding-roles" role="group" aria-label="Job function">
              {roles.map((role) => (
                <button
                  key={role}
                  className="onboarding-button onboarding-outline"
                  aria-pressed={selected === role}
                  disabled={selected !== null}
                  onClick={() => {
                    if (selected) return;
                    setSelected(role);
                    router.push(link("/onboarding/connect/zoom"));
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
          </>
        )}
        {step === "zoom" && (
          <>
            <p className="onboarding-eyebrow">CONNECT TO ZOOM</p>
            <h1 id="onboarding-heading">
              Zoom requires a connection for Sounding
              <br className="onboarding-desktop-break" /> to capture your meetings
            </h1>
            <button className="onboarding-button onboarding-outline onboarding-zoom" disabled>
              <Video size={30} />
              Connect to Zoom
            </button>
            <p className="onboarding-note">Zoom connection is unavailable in this demo.</p>
            <p className="onboarding-skip">
              Never join Zoom meetings?{" "}
              <Link href={link("/zoomless/onboarding/download")}>Skip this step</Link>
            </p>
          </>
        )}
        {step === "download" && (
          <>
            <p className="onboarding-eyebrow">INSTALL DESKTOP APP</p>
            <h1 id="onboarding-heading">Turn your meetings into momentum</h1>
            <div className="onboarding-cards onboarding-download-cards">
              <article className="onboarding-card onboarding-classic">
                <div className="onboarding-app-icon">
                  <AudioLines size={38} />
                </div>
                <h2>
                  Sounding <span className="onboarding-tag">CLASSIC</span>
                </h2>
                <p>Capture, transcribe and summarize your meetings with the Sounding app.</p>
                <button className="onboarding-button onboarding-outline" disabled>
                  <Monitor size={24} />
                  Download for Windows
                </button>
              </article>
              <article className="onboarding-card">
                <div className="onboarding-app-icon secondary">
                  <AudioLines size={38} />
                </div>
                <h2>
                  Sounding <span className="onboarding-tag">BOT-FREE CAPTURE</span>
                </h2>
                <strong className="onboarding-coming">Coming soon to Windows</strong>
                <p>No bot joining your calls. Capture meetings quietly in the background.</p>
                <button className="onboarding-button onboarding-secondary" disabled>
                  Notify Me
                </button>
              </article>
            </div>
            <p className="onboarding-note">
              Desktop apps are not available in this web demo. Continue in your browser.
            </p>
            <Link className="onboarding-skip" href={destination}>
              Skip this step
            </Link>
          </>
        )}
      </section>
      <footer className="onboarding-footer">
        {step === "preferences" ? (
          <>
            <UserCircle size={17} />
            <span>
              Setting up as <strong>{name}</strong>. Wrong account?
            </span>
            <button disabled={busy} onClick={signOut}>
              Sign out
            </button>
          </>
        ) : step === "zoom" ? (
          <span>
            You&apos;re in control. This demo will not connect to Zoom or join your meetings.
          </span>
        ) : (
          <span>Sounding · Your private workspace · Temporary access lasts 24 hours</span>
        )}
        {error && <p role="alert">{error}</p>}
      </footer>
    </main>
  );
}
