"use client";

import { useEffect, useRef, useState } from "react";
import { searchCourses } from "@/lib/search";

/** Inline search box that adds a catalog course. */
export function CoursePicker({ onPick, onClose }: { onPick: (code: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const results = q.trim() ? searchCourses({ query: q, limit: 6 }) : [];

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  return (
    <div ref={ref} className="relative">
      <input
        autoFocus
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
          if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          if (e.key === "Enter" && results[active]) onPick(results[active].code);
        }}
        placeholder="Code or title"
        aria-label="Search courses"
        className="w-full rounded-md border border-accent bg-raised px-2.5 py-1.5 text-sm outline-none"
      />
      {results.length > 0 && (
        <ul className="absolute right-0 z-30 mt-1 w-72 max-w-[80vw] overflow-hidden rounded-md border border-line bg-raised shadow-lg">
          {results.map((c, i) => (
            <li key={c.code}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(c.code)}
                onMouseEnter={() => setActive(i)}
                className={`block w-full px-3 py-2 text-left text-sm ${i === active ? "bg-accent-tint" : ""}`}
              >
                <span className="font-medium">{c.code}</span>
                <span className="block truncate text-muted">{c.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim() && results.length === 0 && (
        <p className="mt-1 text-xs text-muted">Not in the catalog yet. Try the course code.</p>
      )}
    </div>
  );
}
