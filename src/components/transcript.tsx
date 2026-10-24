"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, Copy, ArrowDownToLine, Plus, Diamond, ListTodo } from "lucide-react";
import { activeSegment, formatTime, type Highlight, type Meeting, type Segment } from "@/lib/domain";
function MarkedText({ text, query }: { text: string; query: string }) {
  const position = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  return position < 0 ? text : <>{text.slice(0, position)}<mark>{text.slice(position, position + query.length)}</mark>{text.slice(position + query.length)}</>;
}
export function Transcript({ meeting, time, seek, highlights, initialQuery, onCreate, copy, readonly = false }: { meeting: Meeting; time: number; seek: (time: number) => void; highlights: Highlight[]; initialQuery: string; onCreate: (segment: Segment, kind: "action" | "highlight") => void; copy: () => void; readonly?: boolean }) {
  const [query, setQuery] = useState(initialQuery);
  const [follow, setFollow] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => meeting.segments.filter(s => !query.trim() || s.text.toLowerCase().includes(query.toLowerCase().trim()) || meeting.participants.find(p => p.id === s.speakerId)?.name.toLowerCase().includes(query.toLowerCase().trim())), [meeting, query]);
  // The virtualizer owns DOM measurements; its functions are intentionally not memoized by React Compiler.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({ count: filtered.length, getScrollElement: () => scrollRef.current, estimateSize: () => meeting.duration >= 3600 ? 270 : 205, overscan: 4, getItemKey: index => filtered[index].id });
  const activeId = meeting.segments[activeSegment(meeting.segments, time)]?.id;
  const activeIndex = filtered.findIndex(s => s.id === activeId);
  useEffect(() => { if (follow && activeIndex >= 0) virtualizer.scrollToIndex(activeIndex, { align: "start" }); }, [activeIndex, follow, virtualizer]);
  return <div className="transcript-content"><div className="transcript-toolbar"><label className="transcript-search"><Search size={14}/><input aria-label="Search transcript" placeholder="Search Transcript" value={query} onChange={e => { setQuery(e.target.value); scrollRef.current?.scrollTo({ top: 0 }); }}/></label><button className="copy-button" onClick={copy}>Copy Transcript <Copy size={13}/></button></div><div className="transcript-toolbar"><span className="transcript-count">{filtered.length} {query ? "matches" : "segments"} · {meeting.participants.length} speakers</span><button className="auto-scroll" aria-pressed={follow} onClick={() => setFollow(!follow)}><ArrowDownToLine size={11}/>{follow ? "Auto-scroll on" : "Resume auto-scroll"}</button></div>
    <div className="transcript-scroll" ref={scrollRef} onWheel={() => setFollow(false)} aria-label="Meeting transcript" tabIndex={0}>
    {!filtered.length ? <div className="transcript-no-results">No transcript matches. Try another phrase or speaker name.</div> : <div style={{ height: virtualizer.getTotalSize(), position:"relative", width:"100%" }}>{virtualizer.getVirtualItems().map(v => {
      const segment = filtered[v.index]; const participant = meeting.participants.find(p => p.id === segment.speakerId);
      const marks = highlights.filter(h => h.time >= segment.start && h.time < segment.end);
      return <div key={v.key} data-index={v.index} ref={virtualizer.measureElement} className={`transcript-row ${activeId === segment.id ? "is-active" : ""}`} style={{position:"absolute", top:0, left:0, width:"calc(100% - 12px)", transform:`translateY(${v.start}px)`}} data-segment-id={segment.id}>
        {marks.map(h => <div className="transcript-highlight" key={h.id}><Diamond size={14}/><strong>{h.category.toUpperCase()}</strong><span>{h.title}</span></div>)}
        <div className="transcript-speaker"><span><i className="speaker-dot" style={{"--speaker":participant?.color} as React.CSSProperties}/>{participant?.name}</span><button aria-label={`Seek to ${formatTime(segment.start)}`} onClick={() => { seek(segment.start); setFollow(true); }}>{formatTime(segment.start)}</button></div>
        <button className="speech-bubble" aria-label={`Play ${participant?.name} at ${formatTime(segment.start)}`} onClick={() => seek(segment.start)}><MarkedText text={segment.text} query={query.trim()}/></button>
        {!readonly && <div className="segment-tools"><button aria-label={`Add action item at ${formatTime(segment.start)}`} onClick={() => onCreate(segment, "action")}><ListTodo size={11}/> Action item</button><button aria-label={`Add highlight at ${formatTime(segment.start)}`} onClick={() => onCreate(segment, "highlight")}><Plus size={11}/> Highlight</button></div>}
      </div>;
    })}</div>}</div></div>;
}
