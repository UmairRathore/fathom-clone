import { notFound } from "next/navigation";
import { getMeeting } from "@/lib/data";
import { MeetingView } from "@/components/meeting-view";
export default async function CallPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; q?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const meeting = getMeeting(id);
  if (!meeting) notFound();
  const parsed = Number(query.t);
  const time = Number.isFinite(parsed) ? Math.min(meeting.duration, Math.max(0, parsed)) : 0;
  return (
    <MeetingView
      key={id}
      meeting={meeting}
      initialTime={time}
      initialQuery={query.q?.slice(0, 200) ?? ""}
    />
  );
}
