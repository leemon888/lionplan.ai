"use client";

import { COURSE_BY_CODE, resolveCode } from "@/data/courses";
import { formatDays, formatTime, meetingFor } from "@/data/sections";
import { analyzePlan, currentAndNext } from "@/lib/engine";
import { placeCourse, startCourseDrag } from "@/lib/dnd";
import { openRequirementFor } from "@/lib/search";
import { removeCourse } from "@/lib/plan-ops";
import { usePlanStore } from "@/lib/store";
import { toneFor } from "@/lib/tone";

/** A course the assistant recommended: add it, mark it taken, or drag it onto a semester. */
export function CourseCard({ code: raw, reason, termId }: { code: string; reason?: string; termId?: string }) {
  const plan = usePlanStore((s) => s.plan);
  const apply = usePlanStore((s) => s.apply);
  const code = resolveCode(raw ?? "") ?? raw;
  const course = code ? COURSE_BY_CODE[code] : undefined;
  if (!plan || !course) {
    return <div className="rounded-xl border border-dashed border-line p-3.5 text-[13px] text-muted">{raw} isn&apos;t in the catalog yet.</div>;
  }

  const target = plan.terms.find((t) => t.id === termId) ?? currentAndNext(plan).next ?? plan.terms[plan.terms.length - 1];
  const where = plan.terms.find((t) => t.courses.includes(course.code));
  const taken = where?.id === "PRE";
  const meeting = meetingFor(course.code, target.id);
  const req = openRequirementFor(course.code, analyzePlan(plan));

  return (
    <article
      draggable={!where}
      onDragStart={(e) => startCourseDrag(e, course.code)}
      className={`flex-[1_1_250px] rounded-xl border bg-raised p-3.5 shadow-[0_1px_2px_rgba(16,24,40,.05)] ${where && !taken ? "border-accent" : "border-line"} ${taken ? "opacity-75" : ""} ${!where ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold">{course.code}</span>
        {meeting && (
          <span className="text-xs text-muted">
            {formatDays(meeting.days)} {formatTime(meeting.start)}
          </span>
        )}
      </div>
      <h4 className="mt-0.5 text-sm font-medium underline decoration-line underline-offset-[3px]">{course.title}</h4>
      {reason && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{reason}</p>}
      {course.prereqText && (
        <p className="mt-1.5 text-xs leading-snug text-muted">
          Prereqs: {course.prereqText}
          {course.prereqSource === "ai" && <span className="text-warn-ink"> (rules read by AI, not checked yet)</span>}
        </p>
      )}
      {course.conditions?.length ? <p className="mt-1 text-xs leading-snug text-muted">Also: {course.conditions.join(", ")}</p> : null}
      {req && <span className={`mt-2.5 inline-block rounded-md px-2 py-0.5 text-xs ${toneFor(course.code)} bg-tone-bg text-tone-ink`}>Counts toward {req}</span>}

      {!where && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => placeCourse(course.code, target.id)} className="min-h-[34px] rounded-lg bg-button px-3 text-[13px] font-medium text-on-button hover:opacity-90">
              Add to {target.label}
            </button>
            <button onClick={() => placeCourse(course.code, "PRE")} className="min-h-[34px] rounded-lg border border-line bg-raised px-3 text-[13px] hover:bg-hover">
              Already taken
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">or drag it onto a semester</p>
        </>
      )}
      {where && (
        <div className="mt-3 flex items-center justify-between gap-2 text-[13px]">
          <span className={taken ? "text-muted" : "font-medium text-ok-ink"}>{taken ? "Marked as taken. We won't suggest it again." : `In ${where.label}`}</span>
          <button onClick={() => apply((p) => removeCourse(p, course.code))} className="min-h-8 px-1 text-muted hover:text-ink">
            Undo
          </button>
        </div>
      )}
    </article>
  );
}
