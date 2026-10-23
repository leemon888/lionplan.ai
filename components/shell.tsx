"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { PROGRAM_BY_ID } from "@/data/programs";
import { usePlanStore, useHydrated } from "@/lib/store";
import { ChatDrawer } from "./chat-drawer";
import { ChatProvider } from "./chat-provider";

const NAV = [
  { href: "/plan", label: "Four-year plan" },
  { href: "/requirements", label: "Requirements" },
  { href: "/explore", label: "Explore courses" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const plan = usePlanStore((s) => s.plan);
  const chatOpen = usePlanStore((s) => s.chatOpen);
  const setChatOpen = usePlanStore((s) => s.setChatOpen);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !plan) router.replace("/");
  }, [hydrated, plan, router]);

  if (!hydrated || !plan) return null;

  const majors = plan.profile.majors.map((m) => PROGRAM_BY_ID[m]?.name).filter(Boolean);

  return (
    <ChatProvider>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line px-5 py-6 md:flex">
          <Link href="/plan" className="font-serif text-2xl font-medium tracking-tight">
            Lionplan
          </Link>
          <nav className="mt-8 flex flex-col gap-1 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-md px-2.5 py-1.5 ${pathname === n.href ? "bg-ink text-white" : "text-ink-soft hover:bg-surface"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto text-sm">
            <p className="font-medium">Class of {plan.profile.classYear}</p>
            <p className="text-ink-soft">{majors.length ? majors.join(" & ") : "Undeclared"}</p>
            <button
              className="mt-3 text-xs text-ink-faint underline-offset-2 hover:underline"
              onClick={() => {
                if (confirm("Start over? This clears your plan on this device.")) usePlanStore.getState().setPlan(null);
              }}
            >
              Start over
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* mobile nav */}
          <header className="flex items-center gap-4 overflow-x-auto border-b border-line px-4 py-3 text-sm md:hidden">
            <span className="shrink-0 font-serif text-xl">Lionplan</span>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`shrink-0 whitespace-nowrap ${pathname === n.href ? "font-medium" : "text-ink-soft"}`}>
                {n.label}
              </Link>
            ))}
          </header>
          <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">{children}</main>
        </div>

        <ChatDrawer />
      </div>

      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed right-5 bottom-5 z-30 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-ink/90"
        >
          Ask Lionplan
        </button>
      )}
    </ChatProvider>
  );
}
