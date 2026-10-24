"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Header } from "./header";
import { useWorkspace } from "./workspace-provider";
import { uploadSchema, MAX_BYTES } from "@/lib/recordings/schema";
import { formatTime } from "@/lib/domain";
type Job = {
  id: string;
  title: string;
  filename: string;
  size: number;
  duration: number | null;
  status: string;
  error: string | null;
  retryable: boolean;
};
const labels: Record<string, string> = {
  uploading: "Uploading",
  uploaded: "Uploaded",
  queued: "Queued",
  transcribing: "Transcribing speech",
  generating_insights: "Generating insights",
  ready: "Ready",
  failed: "Failed",
};
const messages: Record<string, string> = {
  invalid_upload: "Choose a supported recording, no larger than 24 MB and five minutes.",
  duration_exceeded: "Recordings must be five minutes or shorter.",
  missing_audio: "The file has no usable audio track.",
  invalid_media: "This recording is corrupt or unsupported.",
  size_mismatch: "The uploaded size did not match. Delete this attempt and upload again.",
  spending_approval_required:
    "Live AI processing is limited to the specifically approved recording and budget.",
  user_upload_limit: "The limit is three upload attempts per account in 24 hours.",
  provider_limit:
    "OpenAI rejected this request due to its usage limit. No automatic retry will run.",
  provider_request_uncertain:
    "Processing was interrupted. It may have incurred a charge; administrator review is required before any new request.",
  unsupported_evidence:
    "The AI response contained unsupported evidence. The transcript is preserved; no automatic retry will run.",
  private_account_required: "Use your own signed-in account to upload private recordings.",
};
export function UploadRecording() {
  const workspace = useWorkspace()!;
  const router = useRouter();
  const [transferring, setTransferring] = useState(false);
  const [file, setFile] = useState<File | null>(null),
    [duration, setDuration] = useState(0),
    [title, setTitle] = useState("");
  const [error, setError] = useState(""),
    [progress, setProgress] = useState(0),
    [busy, setBusy] = useState(false),
    [processing, setProcessing] = useState(false);
  const [job, setJob] = useState<Job | null>(null),
    [jobs, setJobs] = useState<Job[]>([]),
    [canProcess, setCanProcess] = useState(false);
  const xhr = useRef<XMLHttpRequest | null>(null),
    requestKey = useRef("");
  const selection = useRef(0);
  const privateAccount = !workspace.profile.demo;
  const describe = (code: string) =>
    messages[code] ??
    "This step could not complete. Your saved transcript and completed results are retained. No automatic paid retry will run.";
  async function loadJobs() {
    const r = await fetch("/api/recordings", { cache: "no-store" });
    if (r.ok) setJobs((await r.json()).jobs);
  }
  const loadJob = useCallback(
    async (id: string) => {
      const r = await fetch(`/api/recordings/${id}`, { cache: "no-store" });
      if (r.ok) {
        const result = await r.json();
        setJob(result.job);
        setCanProcess(result.canProcess);
      } else if (r.status === 401) router.replace("/users/sign_in?next=%2Fupload");
    },
    [router],
  );
  useEffect(() => {
    if (!privateAccount) return;
    let live = true;
    fetch("/api/recordings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (live && data) setJobs(data.jobs);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [privateAccount]);
  useEffect(() => {
    if (!job || !privateAccount || ["ready", "failed"].includes(job.status)) return;
    const timer = window.setInterval(() => {
      void loadJob(job.id).catch(() => {});
    }, 2500);
    return () => window.clearInterval(timer);
  }, [job, privateAccount, loadJob]);
  async function choose(next: File) {
    const ticket = ++selection.current;
    setFile(null);
    setDuration(0);
    setError("");
    setJob(null);
    setProgress(0);
    if (next.size > MAX_BYTES || !/\.(mp4|webm|mp3|m4a|wav)$/i.test(next.name)) {
      setError(messages.invalid_upload);
      return;
    }
    const url = URL.createObjectURL(next);
    const media = document.createElement(next.type.startsWith("video/") ? "video" : "audio");
    media.preload = "metadata";
    try {
      const seconds = await new Promise<number>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error()), 15000);
        media.onloadedmetadata = () => {
          clearTimeout(timer);
          resolve(media.duration);
        };
        media.onerror = () => {
          clearTimeout(timer);
          reject(new Error());
        };
        media.src = url;
      });
      if (ticket !== selection.current) return;
      if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 300) {
        setError(messages.duration_exceeded);
        return;
      }
      const mime =
        next.type ||
        (/\.m4a$/i.test(next.name)
          ? "audio/mp4"
          : /\.mp3$/i.test(next.name)
            ? "audio/mpeg"
            : /\.wav$/i.test(next.name)
              ? "audio/wav"
              : /\.webm$/i.test(next.name)
                ? "video/webm"
                : "video/mp4");
      const value = {
        requestKey: crypto.randomUUID(),
        title: next.name.replace(/\.[^.]+$/, ""),
        filename: next.name,
        size: next.size,
        mime,
        duration: seconds,
      };
      if (!uploadSchema.safeParse(value).success) {
        setError(messages.invalid_upload);
        return;
      }
      requestKey.current = value.requestKey;
      setFile(new File([next], next.name, { type: mime }));
      setDuration(seconds);
      setTitle(value.title);
    } catch {
      setError("The browser could not read this file. Try a supported MP4, WebM, MP3, M4A or WAV.");
    } finally {
      media.removeAttribute("src");
      media.load();
      URL.revokeObjectURL(url);
    }
  }
  async function send(path: string, body: unknown = {}, method = "POST") {
    const r = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(describe(data.error));
    return data;
  }
  async function upload() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const created = await send("/api/recordings", {
        requestKey: requestKey.current,
        title,
        filename: file.name,
        size: file.size,
        mime: file.type,
        duration,
      });
      setJob(created.job);
      if (created.upload) {
        await new Promise<void>((resolve, reject) => {
          const transfer = new XMLHttpRequest();
          xhr.current = transfer;
          setTransferring(true);
          transfer.open("PUT", created.upload.url);
          transfer.setRequestHeader("Content-Type", file.type);
          transfer.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
          };
          transfer.onload = () =>
            transfer.status >= 200 && transfer.status < 300
              ? resolve()
              : reject(
                  new Error(
                    "Private upload failed. Retry with the same file or delete the attempt.",
                  ),
                );
          transfer.onerror = () => reject(new Error("The upload connection failed."));
          transfer.onabort = () =>
            reject(
              new Error(
                "Upload cancelled. Delete the unfinished attempt to remove any stored data.",
              ),
            );
          transfer.send(file);
        });
        const result = await send(`/api/recordings/${created.job.id}/complete`);
        setJob(result.job);
        await loadJob(result.job.id);
      } else {
        await loadJob(created.job.id);
      }
      await loadJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      xhr.current = null;
      setTransferring(false);
    }
  }
  async function process() {
    if (!job) return;
    setProcessing(true);
    setError("");
    try {
      let current = job;
      for (let step = 0; step < 4; step++) {
        const result = await send(`/api/recordings/${current.id}/process`);
        current = result.job;
        setJob(current);
        if (current.status === "ready") {
          router.push(`/calls/${current.id}`);
          return;
        }
        if (current.status === "failed") {
          setError(describe(current.error ?? ""));
          break;
        }
        if (current.status === "transcribing") break;
      }
      await loadJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Processing failed.");
    } finally {
      setProcessing(false);
    }
  }
  async function remove() {
    if (
      !job ||
      !window.confirm(
        "Delete this uploaded recording and its saved meeting? This cannot be undone.",
      )
    )
      return;
    setBusy(true);
    try {
      const r = await fetch(`/api/recordings/${job.id}`, { method: "DELETE" });
      if (!r.ok)
        throw new Error("Deletion could not complete. Active processing must finish first.");
      setJob(null);
      setFile(null);
      setError("");
      await loadJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header />
      <main className="journey-page upload-page">
        <Link href="/home">← My Calls</Link>
        <h1>Upload Recording</h1>
        <p>Turn a real conversation into a searchable transcript and useful next steps.</p>
        {!privateAccount ? (
          <section className="journey-card">
            <h2>Your recordings stay private</h2>
            <p>
              Sign in to your own account to upload. The public demo never uploads private files or
              consumes AI credits.
            </p>
            <Link className="primary-button" href="/users/sign_in/email?next=%2Fupload">
              Sign in with email
            </Link>
          </section>
        ) : (
          <>
            <p className="journey-notice">
              Private storage · MP4/WebM with audio, MP3, M4A or WAV · Up to 5 minutes and 24 MB.
              For video, use compressed 720p where practical. Preserve clear audio. No server video
              transcoding.
            </p>
            <section className="journey-card">
              <label
                className="upload-dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!busy && !processing && e.dataTransfer.files[0])
                    void choose(e.dataTransfer.files[0]);
                }}
              >
                <UploadCloud size={30} />
                <strong>Choose a recording or drop it here</strong>
                <input
                  aria-label="Choose recording"
                  type="file"
                  accept=".mp4,.webm,.mp3,.m4a,.wav"
                  disabled={busy || processing}
                  onChange={(e) => {
                    if (e.target.files?.[0]) void choose(e.target.files[0]);
                  }}
                />
              </label>
              {file && (
                <div className="upload-review">
                  <h2>Review recording</h2>
                  <p>
                    {file.name} · {(file.size / 1_000_000).toFixed(2)} MB · {formatTime(duration)}
                  </p>
                  <label>
                    Meeting title
                    <input
                      aria-label="Meeting title"
                      maxLength={180}
                      value={title}
                      disabled={busy || !!job}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </label>
                  {!job && (
                    <button
                      className="primary-button"
                      disabled={busy || !title.trim()}
                      onClick={upload}
                    >
                      Upload privately
                    </button>
                  )}
                </div>
              )}
              {busy && (
                <>
                  <progress aria-label="Upload progress" value={progress} max={100} />
                  <p>
                    {progress}% transferred ·{" "}
                    {progress === 100 ? "Verifying stored media…" : "Uploading to private storage…"}
                  </p>
                  {transferring && (
                    <button className="secondary-button" onClick={() => xhr.current?.abort()}>
                      Cancel upload
                    </button>
                  )}
                </>
              )}
              {job && (
                <div className="processing-job" data-job-id={job.id}>
                  <h2 role="status">{labels[job.status] ?? job.status}</h2>
                  <p>
                    {job.title}
                    {job.duration ? ` · ${formatTime(job.duration)}` : ""}
                  </p>
                  {job.error && <p role="alert">{describe(job.error)}</p>}
                  {["uploaded", "queued", "generating_insights"].includes(job.status) && (
                    <>
                      <button
                        className="primary-button"
                        disabled={processing || busy || !canProcess}
                        onClick={process}
                      >
                        {processing ? "Processing…" : "Process recording"}
                      </button>
                      <p>
                        {canProcess
                          ? "Transcription and analysis use paid APIs within the approved test budget."
                          : "This upload is saved. Live processing requires administrator approval for this recording and budget."}
                      </p>
                    </>
                  )}
                  {["transcribing", "generating_insights"].includes(job.status) && (
                    <p>
                      Actual stored processing state is shown. You may leave and return; completed
                      stages are cached. A submitted API request cannot safely be cancelled or
                      automatically retried.
                    </p>
                  )}
                  {job.status === "ready" && (
                    <Link className="primary-button" href={`/calls/${job.id}`}>
                      Open meeting
                    </Link>
                  )}
                  {!processing &&
                    !busy &&
                    !["transcribing", "generating_insights"].includes(job.status) && (
                      <button className="secondary-button" onClick={remove}>
                        Delete recording
                      </button>
                    )}
                </div>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
            </section>
            <section className="journey-card">
              <h2>Your uploads</h2>
              {!jobs.length && <p>No private recordings uploaded yet.</p>}
              {jobs.map((j) => (
                <button className="upload-job-row" key={j.id} onClick={() => void loadJob(j.id)}>
                  <span>{j.title}</span>
                  <span>{labels[j.status] ?? j.status}</span>
                </button>
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}
