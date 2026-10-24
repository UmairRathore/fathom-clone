import { notFound } from "next/navigation";
import { ClipViewer } from "@/components/clip-viewer";
import { validClip, clipSegments } from "@/lib/journey";
import { MeetingView } from "@/components/meeting-view";
import { getMeeting } from "@/lib/data";
import { openShare } from "@/lib/sharing";
import { restoreState } from "@/lib/state";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Shared meeting · Sounding",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function SharedPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { token } = await params;
  const secret = process.env.SHARE_SECRET;
  const payload = secret ? openShare(token, secret) : null;
  if (!payload || payload.visibility === "restricted" || !payload.state) notFound();
  const meeting = getMeeting(payload.meetingId);
  if (!meeting) notFound();
  if (payload.clip) {
    if (!validClip(payload.clip, meeting)) notFound();
    return (
      <ClipViewer
        title={payload.clip.title}
        meetingTitle={meeting.title}
        clip={payload.clip}
        participants={meeting.participants}
        segments={clipSegments(meeting.segments, payload.clip)}
        mediaUrl={meeting.mediaUrl ? `/api/clips/${token}/media` : undefined}
      />
    );
  }
  const state = restoreState(JSON.stringify(payload.state), meeting);
  const query = await searchParams;
  const parsedTime = Number(query.t);
  const time = Number.isFinite(parsedTime)
    ? Math.max(0, Math.min(parsedTime, meeting.duration))
    : 0;
  return (
    <MeetingView
      shared
      meeting={{ ...meeting, actions: state.actions, highlights: state.highlights }}
      initialPreferences={state.preferences}
      initialTime={time}
    />
  );
}
