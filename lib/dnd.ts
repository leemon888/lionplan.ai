"use client";

import { addCourse, moveCourse } from "./plan-ops";
import { usePlanStore } from "./store";

// Drag and drop between chat cards, the calendars and the four-year grid.
export const COURSE_MIME = "text/x-lionplan-course";

export function startCourseDrag(e: React.DragEvent, code: string) {
  e.dataTransfer.setData(COURSE_MIME, code);
  e.dataTransfer.setData("text/plain", code);
  e.dataTransfer.effectAllowed = "copyMove";
}

export function isCourseDrag(e: React.DragEvent) {
  return e.dataTransfer.types.includes(COURSE_MIME);
}

/** Put a course in a term: move it if it's already planned somewhere, otherwise add it. */
export function placeCourse(code: string, termId: string) {
  const { plan, apply, flashCourse } = usePlanStore.getState();
  if (!plan) return null;
  const already = plan.terms.some((t) => t.courses.includes(code));
  const res = apply((p) => (already ? moveCourse(p, code, termId) : addCourse(p, code, termId)));
  if (res?.ok) flashCourse(code);
  return res;
}

export function dropCourse(e: React.DragEvent, termId: string) {
  e.preventDefault();
  const code = e.dataTransfer.getData(COURSE_MIME);
  return code ? placeCourse(code, termId) : null;
}
