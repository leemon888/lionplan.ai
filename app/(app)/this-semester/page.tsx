import { SemesterView } from "@/components/semester-view";

// The page is built from the plan saved in the browser, so it can't be prerendered on the server.
export const instant = false;

export default function ThisSemesterPage() {
  return <SemesterView which="current" />;
}
