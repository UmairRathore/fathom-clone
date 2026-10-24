import type { Meeting, Participant, Segment, SummarySection } from "./domain";
import timing from "./media-timing.json";
export const people: Participant[] = [
  { id: "maya", name: "Maya Chen", role: "Product", color: "#087d92" },
  { id: "alex", name: "Alex Rivera", role: "Engineering", color: "#6656a7" },
  { id: "jordan", name: "Jordan Lee", role: "Design", color: "#9a6539" },
  { id: "sam", name: "Sam Taylor", role: "Customer success", color: "#347e61" },
  { id: "priya", name: "Priya Shah", role: "Data", color: "#a34f73" },
  { id: "noah", name: "Noah Brooks", role: "Platform", color: "#537c9f" },
  { id: "elena", name: "Elena Park", role: "Marketing", color: "#9a7c36" },
  { id: "chris", name: "Chris Morgan", role: "Operations", color: "#6f7582" },
];
export const demoLines = [
  "Welcome to the Atlas launch review. Today we need to agree on the onboarding experience, resolve the search issue, and confirm our Friday release. Alex, can you share the engineering update?",
  "The new search index is ready. Transcript queries now return results in under two hundred milliseconds. I will add the remaining regression tests by Thursday. The rollout will start with ten percent of workspaces.",
  "We tested the onboarding prototype with five customers. Four completed setup without help. The remaining customer missed the invite button, so I will increase its contrast and share the updated design tomorrow.",
  "Customers have asked for timestamp links in shared recordings. Our support team can document that workflow before launch. I will also prepare a short guide that explains who can view a shared link.",
  "That sounds good. The decision is to ship the new onboarding and search together on Friday. We will keep the legacy experience available for one week and monitor activation and query latency.",
  "One risk is the migration window. We need a rollback checkpoint before moving the final workspaces. I will own the checklist and pair with Maya to review the go or no go criteria.",
  "For the final design review, I will check the mobile transcript and the empty search state. We should show a helpful message when there are no matches, rather than leaving the page blank.",
  "Thanks everyone. Alex owns the regression tests, Jordan owns the onboarding polish, and Sam owns the sharing guide. Our next check in is Thursday at ten. We have a clear plan for Friday.",
];
const shortSegments: Segment[] = timing.segments.map((s, i) => ({ id: `short-${i}`, speakerId: ["maya", "alex", "jordan", "sam", "maya", "alex", "jordan", "maya"][i], start: s.start, end: s.end, text: demoLines[i] }));
const enhanced: SummarySection[] = [
  { title: "Meeting Purpose", bullets: ["Align on the Atlas launch, review onboarding feedback, and confirm the Friday release plan."], time: 0 },
  { title: "Key Takeaways", bullets: ["Release decision: Ship the new onboarding and search experience together on Friday, starting with 10% of workspaces.", "Search performance: The new transcript index returns results in under 200 ms. Regression tests are due Thursday.", "Customer feedback: Four of five customers completed onboarding unaided. Improve the invite button contrast.", "Risk & mitigation: Keep the legacy experience for one week and prepare a migration rollback checkpoint."], time: shortSegments[1].start },
  { title: "Topics", bullets: [], time: 0 },
  { title: "Search Performance & Reliability", bullets: ["The transcript search index is ready for a staged rollout.", "Alex will complete regression coverage and prepare the rollback checklist.", "Monitor query latency and activation throughout the release."], time: shortSegments[1].start },
  { title: "Onboarding & Customer Experience", bullets: ["Jordan will improve the invite button contrast and check mobile transcript states.", "Sam will prepare timestamp-link and sharing-permission documentation."], time: shortSegments[2].start },
  { title: "Decisions & Next Steps", bullets: ["Launch onboarding and search together on Friday.", "Roll out to 10% of workspaces first; retain the legacy flow for one week.", "Review go/no-go criteria at Thursday’s 10:00 check-in."], time: shortSegments[4].start },
];
const project: SummarySection[] = [
  { title: "Meeting Purpose", bullets: ["Confirm readiness for the Atlas Friday release."], time: 0 },
  { title: "Issues & Tickets", bullets: [], time: 0 },
  { title: "ATLAS-142 · Transcript Search", bullets: ["Status: Ready for staged rollout. Queries return in under 200 ms.", "Owner: Alex Rivera. Complete regression tests by Thursday.", "Decision: Start with 10% of workspaces; monitor query latency."], time: shortSegments[1].start },
  { title: "ATLAS-156 · Onboarding Polish", bullets: ["Context: 4 of 5 customers completed setup without help.", "Concern: Invite button contrast affected discoverability.", "Next step: Jordan to share the revised design tomorrow and check mobile states."], time: shortSegments[2].start },
  { title: "ATLAS-163 · Release Readiness", bullets: ["Owner: Alex to prepare migration rollback checklist.", "Sam to publish the timestamp-link sharing guide before launch.", "Current objective: Thursday 10:00 go/no-go review, Friday release."], time: shortSegments[5].start },
];
const topics = [
  ["Launch scope", "We will launch the workspace onboarding with a guided checklist. The key decision is to keep the first session focused on one useful recording and one clear next step."],
  ["Search reliability", "The transcript search index needs to handle partial phrases and participant names. Our target is a p95 latency below two hundred milliseconds with a reliable empty state."],
  ["Customer feedback", "Customer interviews show that timestamp links build trust. People want to jump directly from a summary decision to the original discussion and understand the surrounding context."],
  ["Design review", "The design review covers contrast, keyboard focus, and the narrow screen transcript. Every annotation needs a clear category and a timestamp that stays easy to select."],
  ["Data quality", "We will monitor activation and search success separately. The migration dashboard must flag missing transcript segments and retain the original timestamp relationships."],
  ["Infrastructure", "The infrastructure plan uses a gradual rollout with a rollback checkpoint. We will review memory usage for long transcripts before increasing the workspace percentage."],
  ["Release messaging", "Our release message will explain the improved onboarding, searchable transcripts, and explicit sharing controls. We will avoid promising integrations that are not available."],
  ["Decisions and owners", "We agreed to ship on Friday if the reliability checks pass. The amber lighthouse checkpoint is the final approval gate. Owners will post their evidence before Thursday at ten."],
];
const longSegments: Segment[] = Array.from({ length: 240 }, (_, i) => {
  const topic = topics[Math.floor(i / 30)];
  const speaker = people[i % 8];
  const followups = ["I will document the acceptance criteria for this phase.", "Let’s measure this with the pilot workspaces first.", "The fallback should preserve the customer’s work.", "We should include that in our Thursday review."];
  return { id: `long-${i}`, speakerId: speaker.id, start: i * 15, end: (i + 1) * 15, text: `${topic[0]}. ${topic[1]} ${followups[i % 4]} ${i % 30 === 29 ? `Decision ${Math.floor(i / 30) + 1}: ${speaker.name} owns the follow-up for this workstream.` : `For review ${i + 1}, ${speaker.name.split(" ")[0]} will track ${["customer impact", "latency", "accessibility", "test coverage", "activation", "rollout safety", "documentation", "dependencies"][i % 8]}.`}` };
});
const longSummary: SummarySection[] = [
  { title: "Meeting Purpose", bullets: ["Eight-person cross-functional review of the Atlas release, from launch scope to operational readiness. Synthetic 60-minute timeline; no corresponding recording."], time: 0 },
  { title: "Key Takeaways", bullets: ["Friday launch remains conditional on reliability checks and Thursday’s amber lighthouse approval checkpoint.", "Eight workstreams have explicit owners spanning product, engineering, design, customer success, data, platform, marketing, and operations.", "Keep the rollout gradual; preserve a rollback checkpoint and monitor p95 latency and activation independently."], time: 0 },
  ...topics.map((t, i) => ({ title: t[0], bullets: [t[1], `${people[(i + 1) % 8].name} will prepare evidence for Thursday’s review.`], time: i * 450 })),
];
const base: Meeting = {
  id: "atlas-launch", title: "Atlas · Product launch review", date: "2026-10-24T10:00:00Z", duration: timing.duration,
  participants: people.slice(0, 4), status: "ready", kind: "recording", mediaUrl: "/media/atlas-review.wav",
  description: "A short, self-generated spoken demo with synchronized transcript.", segments: shortSegments,
  summaries: { Enhanced: enhanced, "Project Update": project },
  actions: [
    { id: "a1", text: "Complete search regression tests by Thursday", time: shortSegments[1].start, done: false, assignee: "alex" },
    { id: "a2", text: "Improve invite button contrast and share revised design", time: shortSegments[2].start, done: false, assignee: "jordan" },
    { id: "a3", text: "Prepare the timestamp-link sharing guide", time: shortSegments[3].start, done: false, assignee: "sam" },
  ],
  highlights: [
    { id: "h1", title: "Search is ready for rollout", time: shortSegments[1].start, end: shortSegments[1].end, category: "Highlight", description: "Sub-200 ms queries and a staged release plan." },
    { id: "h2", title: "Customer testing results", time: shortSegments[2].start, end: shortSegments[2].end, category: "Positive Reaction", description: "Four of five customers completed onboarding unaided." },
    { id: "h3", title: "Friday launch decision", time: shortSegments[4].start, end: shortSegments[4].end, category: "Highlight", description: "Ship onboarding and search together; retain the legacy flow." },
    { id: "h4", title: "Migration rollback checkpoint", time: shortSegments[5].start, end: shortSegments[5].end, category: "Needs Review", description: "Alex owns the release safety checklist." },
  ], shareKey: "atlas-public-demo",
};
export const meetings: Meeting[] = [base, {
  ...base, id: "quarterly-planning", title: "Atlas · Q4 cross-functional planning", date: "2026-10-24T08:00:00Z", duration: 3600,
  participants: people, kind: "synthetic", mediaUrl: undefined, description: "Eight speakers · 240 synthetic transcript segments · no recording", segments: longSegments,
  summaries: { Enhanced: longSummary, "Project Update": [{ title: "Current Objective", bullets: ["Coordinate eight workstreams for a reliable Friday launch."], time: 0 }, ...longSummary.slice(2)] },
  actions: people.map((p, i) => ({ id: `long-a${i}`, text: `Prepare ${topics[i][0].toLowerCase()} evidence for Thursday`, time: i * 450 + 30, assignee: p.id, done: i === 2 })),
  highlights: topics.map((t, i) => ({ id: `long-h${i}`, title: t[0], time: i * 450, end: i * 450 + 45, category: i === 5 ? "Needs Review" : "Highlight", description: t[1] })), shareKey: "planning-public-demo",
}, ...[
  ["design-critique", "Onboarding · Design critique", "2026-10-23T14:00:00Z", "Design"],
  ["customer-voice", "Customer voice · Sharing that feels simple", "2026-10-23T09:30:00Z", "Customer success"],
].map(([id, title, date, topic]): Meeting => ({
  ...base, id, title, date, kind: "synthetic", mediaUrl: undefined, duration: 180,
  description: `Synthetic ${topic.toLowerCase()} discussion · transcript-only demo`,
  participants: topic === "Design" ? [people[0], people[2]] : [people[0], people[3]],
  segments: Array.from({ length: 12 }, (_, i) => ({ id: `${id}-${i}`, start: i * 15, end: (i + 1) * 15, speakerId: i % 2 ? (topic === "Design" ? "jordan" : "sam") : "maya", text: topic === "Design" ? `Review ${i + 1}: ${["The invite button needs stronger contrast and a clearer label.", "Mobile transcript controls should stay visible above the keyboard.", "The empty search state should explain how to try a broader phrase."][i % 3]}` : `Customer insight ${i + 1}: ${["Customers want shareable timestamp links with a clear audience.", "The default should explain exactly who can view a recording.", "A read-only viewer helps customers find decisions without editing the source."][i % 3]}` })),
  summaries: { Enhanced: [{ title: "Meeting Purpose", bullets: [`Review ${topic.toLowerCase()} feedback for the Atlas release.`], time: 0 }, { title: "Key Takeaways", bullets: topic === "Design" ? ["Improve invite button contrast.", "Keep mobile transcript controls accessible.", "Design a helpful empty search state."] : ["Explain sharing permissions clearly.", "Support direct timestamp links.", "Keep shared viewers read-only."], time: 15 }], "Project Update": [{ title: "Issues & Tickets", bullets: [`${topic}: ready for final review.`, "Next step: confirm acceptance criteria with Maya on Thursday."], time: 0 }] },
  actions: [{ id: `${id}-a`, text: `Document ${topic.toLowerCase()} acceptance criteria`, time: 15, done: false, assignee: topic === "Design" ? "jordan" : "sam" }], highlights: [], shareKey: `${id}-public-demo`,
}))];
export function getMeeting(id: string) { return meetings.find(m => m.id === id); }

