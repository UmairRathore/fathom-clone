import { notFound } from "next/navigation";
import { getMeeting } from "@/lib/data";
import { MeetingView } from "@/components/meeting-view";
export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = getMeeting(id);
  if (!meeting) notFound();
  return <MeetingView meeting={meeting} />;
}
