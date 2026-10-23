import { type Meeting, toMinutes } from "@/data/sections";

/** One hour the student picked on the weekly calendar, e.g. { day: "R", hour: 14 } is Thursday 2 to 3pm. */
export interface Slot {
  day: string; // M T W R F
  hour: number; // 24h start of the hour
}

export const sameSlot = (a: Slot, b: Slot) => a.day === b.day && a.hour === b.hour;

/** True if the meeting overlaps any picked hour, even partly: a 1:10 to 2:25 class matches 2 to 3pm. */
export function meetsDuring(m: Meeting, slots: Slot[]) {
  const start = toMinutes(m.start);
  const end = toMinutes(m.end);
  return slots.some((s) => m.days.includes(s.day) && start < (s.hour + 1) * 60 && s.hour * 60 < end);
}

/** Picked hours merged into back-to-back runs per day, in calendar order. */
export function slotRuns(slots: Slot[]): { day: string; from: number; to: number }[] {
  const runs: { day: string; from: number; to: number }[] = [];
  for (const day of "MTWRF") {
    const hours = slots.filter((s) => s.day === day).map((s) => s.hour).sort((a, b) => a - b);
    for (const h of hours) {
      const last = runs[runs.length - 1];
      if (last && last.day === day && last.to === h) last.to = h + 1;
      else runs.push({ day, from: h, to: h + 1 });
    }
  }
  return runs;
}

const hourLabel = (h: number) => `${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}`;
const DAY_NAMES: Record<string, string> = { M: "Mon", T: "Tue", W: "Wed", R: "Thu", F: "Fri" };

/** "Tue 2pm to 4pm, Thu 6pm to 7pm" */
export function describeSlots(slots: Slot[]) {
  return slotRuns(slots)
    .map((r) => `${DAY_NAMES[r.day]} ${hourLabel(r.from)} to ${hourLabel(r.to)}`)
    .join(", ");
}
