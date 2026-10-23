"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { currentAndNext } from "@/lib/engine";
import { SCHOOL_LABEL } from "@/lib/onboarding";
import { usePlanStore, useHydrated } from "@/lib/store";
import { ChatPanel } from "./chat-panel";
import { ChatProvider } from "./chat-provider";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const ICONS = {
  now: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.5" y="3.5" width="13" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 7.5h13M6 2v3M12 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  next: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.5" y="3.5" width="13" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 7.5h13M6 2v3M12 2v3M7.5 11.5h4m-1.5-1.5 1.5 1.5-1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plan: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="2.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2.5" y="10.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="10.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

export function Shell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const plan = usePlanStore((s) => s.plan);
  const mode = usePlanStore((s) => s.chatMode);
  const router = useRouter();
  const pathname = usePathname();
  const [saveNote, setSaveNote] = useState(false);

  useEffect(() => {
    if (hydrated && !plan) router.replace("/");
  }, [hydrated, plan, router]);

  if (!hydrated || !plan) return null;

  const { current, next } = currentAndNext(plan);
  const nav = [
    { href: "/this-semester", label: "This semester", meta: current?.season, icon: ICONS.now },
    { href: "/next-semester", label: "Next semester", meta: next?.season, icon: ICONS.next },
    { href: "/plan", label: "Four-year plan", meta: undefined, icon: ICONS.plan },
  ];
  const p = plan.profile;

  return (
    <ChatProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-line bg-side px-3.5 py-5 md:flex">
          <Link href="/next-semester" className="px-2 py-1">
            <Logo />
          </Link>

          <nav aria-label="Pages" className="flex flex-col gap-0.5">
            {nav.map((n) => {
              const on = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 ${on ? "bg-raised font-medium text-ink shadow-[0_1px_2px_rgba(16,24,40,.08),inset_0_0_0_1px_var(--line)]" : "text-ink-2 hover:bg-hover"}`}
                >
                  {n.icon}
                  <span className="flex-1">{n.label}</span>
                  {n.meta && <span className="text-xs text-muted">{n.meta}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-3">
            {saveNote && (
              <p className="px-2 text-xs leading-relaxed text-muted">
                Your plan already saves in this browser. Accounts to sync across devices are coming.
              </p>
            )}
            <button onClick={() => setSaveNote(!saveNote)} className="min-h-9 rounded-lg border border-line bg-raised text-[13px] font-medium hover:bg-hover">
              Save your plan
            </button>
            <ThemeToggle />
            <Link
              href="/profile"
              aria-current={pathname === "/profile" ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${pathname === "/profile" ? "bg-raised shadow-[0_1px_2px_rgba(16,24,40,.08),inset_0_0_0_1px_var(--line)]" : "hover:bg-hover"}`}
            >
              <span aria-hidden="true" className="grid size-[30px] place-items-center rounded-full bg-accent-tint text-[13px] font-semibold text-accent-ink">
                {(p.name || "?").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate font-medium">{p.name || "You"}</div>
                <div className="truncate text-xs text-muted">
                  {SCHOOL_LABEL[p.school]}, {p.classYear}
                </div>
              </div>
            </Link>
          </div>
        </aside>

        {/* phone navigation */}
        <header className="flex items-center gap-4 overflow-x-auto border-b border-line px-4 py-3 text-sm md:hidden">
          <Logo className="shrink-0" />
          {[...nav, { href: "/profile", label: "Profile" }].map((n) => (
            <Link key={n.href} href={n.href} className={`shrink-0 whitespace-nowrap ${pathname === n.href ? "font-medium text-ink" : "text-muted"}`}>
              {n.label}
            </Link>
          ))}
        </header>

        <div className="relative h-[calc(100vh-49px)] min-w-0 flex-1 overflow-hidden md:h-screen">
          <main className="absolute inset-x-0 top-0 overflow-y-auto" style={{ bottom: mode === "third" ? "40%" : 0 }}>
            {children}
          </main>
          <ChatPanel />
        </div>
      </div>
    </ChatProvider>
  );
}
