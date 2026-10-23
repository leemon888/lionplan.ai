"use client";

import { COURSES } from "@/data/courses";
import { conflicts, formatDays, formatTime, knownMeetingFor, seasonOf } from "@/data/sections";
import { analyzePlan } from "@/lib/engine";
import { placeCourse } from "@/lib/dnd";
import { openRequirementFor } from "@/lib/search";
import { type Slot, describeSlots, meetsDuring } from "@/lib/slots";
import { usePlanStore } from "@/lib/store";
import { toneFor } from "@/lib/tone";

/** Classes that meet during the hours picked on the calendar, ready to add to this semester. */
export function SlotMatches({
  termId,
  slots,
  onClear,
  onNotice,
}: {
  termId: string;
  slots: Slot[];
  onClear: () => void;
  onNotice: (message: string | null) => void;
}) {
  const plan = usePlanStore((s) => s.plan)!;

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-4 text-[13px] leading-relaxed text-muted">
        Click an hour on the calendar when you&apos;re free, or drag across several. Classes that meet during those hours show up here.
      </div>
    );
  }

  const term = plan.terms.find((t) => t.id === termId)!;
  const planned = new Set(plan.terms.flatMap((t) => t.courses));
  const report = analyzePlan(plan);
  // Only real (last published) times, only courses offered in this term's season, and no 0-point
  // discussion or lab sections (those come with a lecture).
  const season = seasonOf(termId);
  const matches = COURSES.filter((c) => !planned.has(c.code) && c.points > 0 && (!c.offered || c.offered.includes(season)))
    .flatMap((c) => {
      const m = knownMeetingFor(c.code, termId);
      if (!m || !meetsDuring(m, slots)) return [];
      const clash = conflicts([...term.courses, c.code], termId).find((pair) => pair.includes(c.code));
      return [{ course: c, meeting: m, clash: clash?.find((x) => x !== c.code), req: openRequirementFor(c.code, report) }];
    })
    // free of clashes first, then ones that count toward something you still need
    .sort((a, b) => Number(!!a.clash) - Number(!!b.clash) || Number(!a.req) - Number(!b.req) || a.course.code.localeCompare(b.course.code));

  return (
    <section aria-label="Classes in your free hours">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">
            {matches.length} {matches.length === 1 ? "class meets" : "classes meet"} then
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">{describeSlots(slots)}</p>
        </div>
        <button onClick={onClear} className="min-h-8 shrink-0 px-1 text-[13px] text-muted hover:text-ink">
          Clear
        </button>
      </div>
      {matches.length === 0 && <p className="text-[13px] text-muted">Nothing in the catalog meets during those hours. Try picking more.</p>}
      {matches.length > 0 && (
        <p className="mb-3 text-xs leading-relaxed text-muted">
          Times are the last ones Columbia published for this season. Check Vergil for this year&apos;s.
        </p>
      )}
      <ul className="space-y-2.5">
        {matches.map(({ course, meeting, clash, req }) => (
          <li key={course.code} className={`rounded-xl border border-line bg-raised p-3.5 ${clash ? "opacity-70" : ""}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-semibold">{course.code}</span>
              <span className="text-xs text-muted">{course.points} pts</span>
            </div>
            <h3 className="mt-0.5 text-sm font-medium">{course.title}</h3>
            <p className="mt-1 text-xs text-muted">
              {formatDays(meeting.days)} {formatTime(meeting.start)} to {formatTime(meeting.end)}
              <span className="text-placeholder"> · time from {meeting.lastKnown}</span>
            </p>
            {req && <span className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs ${toneFor(course.code)} bg-tone-bg text-tone-ink`}>Counts toward {req}</span>}
            <div className="mt-3 flex items-center gap-3">
              <button
                disabled={!!clash}
                onClick={() => {
                  const res = placeCourse(course.code, termId);
                  onNotice(res && !res.ok ? res.error : null);
                }}
                className="min-h-[34px] rounded-lg bg-button px-3 text-[13px] font-medium text-on-button hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add to schedule
              </button>
              {clash && <span className="text-xs text-warn-ink">Conflicts with {clash}</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
