"use client";

import { setThemePref, useThemePref, type ThemePref } from "@/lib/theme";

const OPTIONS: { id: ThemePref; label: string; icon: React.ReactNode }[] = [
  {
    id: "light",
    label: "Light",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "dark",
    label: "Dark",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "system",
    label: "System",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="12" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M6 14h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const pref = useThemePref();
  return (
    <div role="radiogroup" aria-label="Theme" className={`flex rounded-lg bg-subtle p-0.5 ${className}`}>
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={pref === o.id}
          aria-label={o.label}
          title={o.label}
          onClick={() => setThemePref(o.id)}
          className={`grid h-7 flex-1 place-items-center rounded-md ${pref === o.id ? "bg-raised text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}
