"use client";
import { groupTranscript, speakerName, transcriptCoverage } from "@/lib/transcript";
import { parseTimestamp } from "@/lib/journey";
import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, Copy, ArrowDownToLine, Plus, Diamond, ListTodo } from "lucide-react";
import {
  activeSegment,
  formatTime,
  type Highlight,
  type Meeting,
  type Segment,
} from "@/lib/domain";
function MarkedText({ text, query }: { text: string; query: string }) {
  const position = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  return position < 0 ? (
    text
  ) : (
    <>
      {text.slice(0, position)}
      <mark>{text.slice(position, position + query.length)}</mark>
      {text.slice(position + query.length)}
    </>
  );
}
export function Transcript({
  meeting,
  time,
  seek,
  highlights,
  initialQuery,
  onCreate,
  copy,
  readonly = false,
}: {
  meeting: Meeting;
  time: number;
  seek: (time: number) => void;
  highlights: Highlight[];
  initialQuery: string;
  onCreate: (segment: Segment, kind: "action" | "highlight") => void;
  copy: () => void;
  readonly?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [speaker, setSpeaker] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [jumpError, setJumpError] = useState("");
  const [follow, setFollow] = useState(true);
  const [selectedId, setSelectedId] = useState<string>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(
    () =>
      meeting.segments.filter(
        (s) =>
          (!speaker || s.speakerId === speaker) &&
          (!query.trim() ||
            s.text.toLowerCase().includes(query.toLowerCase().trim()) ||
            meeting.participants
              .find((p) => p.id === s.speakerId)
              ?.name.toLowerCase()
              .includes(query.toLowerCase().trim())),
      ),
    [meeting, query, speaker],
  );
  const paragraphs = useMemo(
    () => groupTranscript(meeting.segments, highlights),
    [meeting.segments, highlights],
  );
  const visibleParagraphs = useMemo(() => {
    const ids = new Set(filtered.map((s) => s.id));
    return paragraphs.filter((p) => p.segments.some((s) => ids.has(s.id)));
  }, [paragraphs, filtered]);
  const coverage = transcriptCoverage(meeting.segments, meeting.duration);
  const virtualized = meeting.duration > 300 || meeting.segments.length > 250;
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: visibleParagraphs.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 240,
    overscan: 4,
    getItemKey: (index) => visibleParagraphs[index].id,
  });
  const candidate = meeting.segments[activeSegment(meeting.segments, time)];
  const activeId =
    candidate && time + 0.001 >= candidate.start && time < candidate.end ? candidate.id : undefined;
  const activeIndex = visibleParagraphs.findIndex((p) => p.segments.some((s) => s.id === activeId));
  useEffect(() => {
    if (!follow || activeIndex < 0) return;
    if (virtualized) virtualizer.scrollToIndex(activeIndex, { align: "start" });
    else {
      const row = scrollRef.current?.querySelector<HTMLElement>(
        `[data-paragraph-index="${activeIndex}"]`,
      );
      if (row) scrollRef.current?.scrollTo({ top: row.offsetTop, behavior: "auto" });
    }
  }, [activeIndex, follow, virtualized, virtualizer]);
  const rows = virtualized
    ? virtualizer.getVirtualItems().map((v) => ({ index: v.index, key: v.key, start: v.start }))
    : visibleParagraphs.map((p, index) => ({ index, key: p.id, start: 0 }));
  function boundary(end: boolean) {
    setFollow(false);
    if (virtualized && visibleParagraphs.length)
      virtualizer.scrollToIndex(end ? visibleParagraphs.length - 1 : 0, {
        align: end ? "end" : "start",
      });
    else scrollRef.current?.scrollTo({ top: end ? scrollRef.current.scrollHeight : 0 });
  }
  return (
    <div className="transcript-content">
      <div className="transcript-toolbar">
        <label className="transcript-search">
          <Search size={14} />
          <input
            aria-label="Search transcript"
            placeholder="Search Transcript"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              scrollRef.current?.scrollTo({ top: 0 });
            }}
          />
        </label>
        <button className="copy-button" aria-label="Copy full transcript" onClick={copy}>
          Copy full transcript <Copy size={13} />
        </button>
      </div>
      <div className="transcript-navigation">
        <label>
          Speaker
          <select
            aria-label="Filter transcript speaker"
            value={speaker}
            onChange={(e) => {
              setSpeaker(e.target.value);
              scrollRef.current?.scrollTo({ top: 0 });
            }}
          >
            <option value="">All speakers</option>
            {meeting.participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const next = parseTimestamp(timestamp, meeting.duration);
            if (next === null) {
              setJumpError(`Enter m:ss between 0:00 and ${formatTime(meeting.duration)}.`);
              return;
            }
            setJumpError("");
            setQuery("");
            setSpeaker("");
            seek(next);
            setFollow(true);
          }}
        >
          <label>
            Jump to time
            <input
              aria-label="Jump to timestamp"
              placeholder="52:30"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
            />
          </label>
          <button className="secondary-button">Go</button>
        </form>
        {query && (
          <>
            <button
              className="secondary-button"
              disabled={!filtered.length}
              onClick={() => {
                seek(
                  ([...filtered].reverse().find((s) => s.start < time - 0.01) ?? filtered.at(-1))!
                    .start,
                );
                setFollow(true);
              }}
            >
              Previous match
            </button>
            <button
              className="secondary-button"
              disabled={!filtered.length}
              onClick={() => {
                seek((filtered.find((s) => s.start > time + 0.01) ?? filtered[0]).start);
                setFollow(true);
              }}
            >
              Next match
            </button>
          </>
        )}
      </div>
      {jumpError && <p role="alert">{jumpError}</p>}
      <div className="transcript-toolbar transcript-overview">
        <span className="transcript-count" role="status">
          Full transcript · {coverage.count} segments ·{" "}
          {coverage.firstStart === null
            ? "No speech"
            : `${formatTime(coverage.firstStart)}–${formatTime(coverage.lastEnd!)}`}{" "}
          / {formatTime(meeting.duration)}
          {query || speaker
            ? ` · ${filtered.length} matching segments in ${visibleParagraphs.length} paragraphs`
            : ` · ${paragraphs.length} paragraphs`}
        </span>
        <button className="secondary-button" onClick={() => boundary(false)}>
          Transcript beginning
        </button>
        <button className="secondary-button" onClick={() => boundary(true)}>
          Transcript end
        </button>
        <button className="auto-scroll" aria-pressed={follow} onClick={() => setFollow(!follow)}>
          <ArrowDownToLine size={11} />
          {follow ? "Auto-scroll on" : "Resume auto-scroll"}
        </button>
      </div>
      {meeting.source === "upload" && (
        <p className="transcript-explanation">
          {meeting.participants.some((p) => p.role.includes("Diarized"))
            ? `${meeting.participants.filter((p) => p.role.includes("Diarized")).length} anonymous voice label(s) returned by the transcription model; identities are unverified.`
            : "Speaker attribution is unavailable; unknown labels do not identify people."}{" "}
          Paragraphs group adjacent speech without changing the words. Click any phrase to seek its
          original timestamp. Existing highlights are shown; Fathom participant names and highlights
          are not imported.
        </p>
      )}
      {virtualized && (
        <p className="transcript-explanation">
          Long transcript: only nearby paragraphs are mounted while scrolling. Copy full transcript
          includes every segment, regardless of this window or filters.
        </p>
      )}
      <div
        className="transcript-scroll"
        ref={scrollRef}
        onWheel={() => setFollow(false)}
        onTouchMove={() => setFollow(false)}
        onKeyDown={(event) => {
          if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key))
            setFollow(false);
        }}
        aria-label="Meeting transcript"
        tabIndex={0}
      >
        {!visibleParagraphs.length ? (
          <div className="transcript-no-results">
            No transcript matches. Try another phrase or speaker name.
          </div>
        ) : (
          <div
            style={{
              height: virtualized ? virtualizer.getTotalSize() : undefined,
              position: "relative",
              width: "100%",
            }}
          >
            {rows.map((v) => {
              const paragraph = visibleParagraphs[v.index];
              const participant = meeting.participants.find((p) => p.id === paragraph.speakerId);
              const selected =
                paragraph.segments.find((s) => s.id === selectedId) ?? paragraph.segments[0];
              return (
                <div
                  key={v.key}
                  data-index={v.index}
                  data-paragraph-index={v.index}
                  ref={virtualized ? virtualizer.measureElement : undefined}
                  className={`transcript-row transcript-paragraph ${paragraph.segments.some((s) => s.id === activeId) ? "is-active" : ""}`}
                  style={
                    virtualized
                      ? {
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "calc(100% - 12px)",
                          transform: `translateY(${v.start}px)`,
                        }
                      : undefined
                  }
                >
                  {paragraph.highlights.map((h) => (
                    <div className="transcript-highlight" key={h.id} data-highlight-id={h.id}>
                      <Diamond size={14} />
                      <strong>{h.category.toUpperCase()}</strong>
                      <span>{h.title}</span>
                    </div>
                  ))}
                  <div className="transcript-speaker">
                    <span>
                      <i
                        className="speaker-dot"
                        style={{ "--speaker": participant?.color } as React.CSSProperties}
                      />
                      {speakerName(meeting.participants, paragraph.speakerId)}
                    </span>
                    <button
                      aria-label={`Seek to ${formatTime(paragraph.start)}`}
                      onClick={() => {
                        seek(paragraph.start);
                        setFollow(true);
                      }}
                    >
                      {formatTime(paragraph.start)}–{formatTime(paragraph.end)}
                    </button>
                  </div>
                  <div className="speech-bubble paragraph-speech">
                    {paragraph.segments.map((segment, i) => (
                      <span key={segment.id}>
                        {i > 0 ? " " : ""}
                        <button
                          data-segment-id={segment.id}
                          className={`transcript-utterance ${segment.id === activeId ? "is-current" : ""}`}
                          aria-label={`Go to ${speakerName(meeting.participants, segment.speakerId)} at ${formatTime(segment.start)}`}
                          title={`Seek to ${formatTime(segment.start)}`}
                          onClick={() => {
                            setSelectedId(segment.id);
                            seek(segment.start);
                            setFollow(true);
                          }}
                        >
                          <MarkedText text={segment.text} query={query.trim()} />
                        </button>
                      </span>
                    ))}
                  </div>
                  {!readonly && (
                    <div className="segment-tools">
                      <span>Selected {formatTime(selected.start)}</span>
                      <button
                        aria-label={`Add action item at ${formatTime(selected.start)}`}
                        onClick={() => onCreate(selected, "action")}
                      >
                        <ListTodo size={11} /> Action item
                      </button>
                      <button
                        aria-label={`Add highlight at ${formatTime(selected.start)}`}
                        onClick={() => onCreate(selected, "highlight")}
                      >
                        <Plus size={11} /> Highlight
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
