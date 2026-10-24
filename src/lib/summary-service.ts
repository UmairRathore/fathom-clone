import type { ActionItem, Meeting, SummarySection } from "./domain";
import type { SummaryPreferences } from "./state";
export interface SummaryService { generate(meeting: Meeting, preferences: SummaryPreferences, actions: ActionItem[]): Promise<SummarySection[]> }
// Replace this boundary with an authenticated server service for real model inference.
export function buildDemoSummary(meeting: Meeting, preferences: SummaryPreferences, actions: ActionItem[]): SummarySection[] {
    const source = meeting.summaries[preferences.template];
    let sections: SummarySection[] = source.map(section => ({...section, bullets:[...section.bullets]}));
    if(preferences.focus === "decisions") sections = sections.filter(s => /purpose|takeaway|decision|objective|readiness/i.test(s.title));
    if(preferences.focus === "actions") sections = [{title:"Meeting Purpose",bullets:source[0].bullets,time:0},{title:"Action Items & Owners",bullets:actions.map(a => `${meeting.participants.find(p => p.id === a.assignee)?.name ?? "Unassigned"}: ${a.text}${a.done ? " (completed)" : ""}`),time:actions[0]?.time ?? 0}];
    if(preferences.length === "concise") sections = sections.map(s => ({...s, bullets:s.bullets.slice(0,2)}));
    return sections;
}
export const demoSummaryService: SummaryService = { async generate(meeting, preferences, actions) { return buildDemoSummary(meeting, preferences, actions); } };
export function answerMeetingQuestion(meeting: Meeting, question: string, actions: ActionItem[]): { text: string; citations: {time:number;label:string}[] } {
  const q = question.toLowerCase();
  if(/action|owner|next step|who/.test(q)) return {text:actions.length ? actions.map(a=>`${meeting.participants.find(p=>p.id===a.assignee)?.name ?? "Unassigned"}: ${a.text}`).join("\n\n") : "There are no action items yet. Add one from a transcript segment.",citations:actions.slice(0,3).map(a=>({time:a.time,label:a.text}))};
  if(/decision|summary|summari|key|risk/.test(q)) { const sections=meeting.summaries.Enhanced.filter(s=>/takeaway|decision|risk/i.test(s.title)); return {text:sections.flatMap(s=>s.bullets).join("\n\n"),citations:sections.map(s=>({time:s.time,label:s.title}))}; }
  const words=q.split(/\W+/).filter(w=>w.length>3 && !["what","when","where","does","were","about","meeting","tell","please"].includes(w));
  const matches=meeting.segments.filter(s=>words.some(w=>s.text.toLowerCase().includes(w))).slice(0,3);
  return {text:matches.length ? matches.map(s=>`${meeting.participants.find(p=>p.id===s.speakerId)?.name}: ${s.text}`).join("\n\n") : "I couldn’t find that in this meeting. Try a topic from the transcript, or ask about decisions and action items.",citations:matches.map(s=>({time:s.start,label:"Transcript source"}))};
}

