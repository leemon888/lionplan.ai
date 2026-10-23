"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OpResult } from "./plan-ops";
import type { Plan } from "./types";

interface State {
  plan: Plan | null;
  history: Plan[];
  chatOpen: boolean;
  /** A message to send to the AI as soon as the chat mounts (e.g. from onboarding). */
  pendingMessage: string | null;
  setPendingMessage: (m: string | null) => void;
  setPlan: (plan: Plan | null) => void;
  /** Apply a plan operation. Successful ops are undoable. */
  apply: (op: (plan: Plan) => OpResult) => OpResult | null;
  undo: () => void;
  setChatOpen: (open: boolean) => void;
}

export const usePlanStore = create<State>()(
  persist(
    (set, get) => ({
      plan: null,
      history: [],
      chatOpen: false,
      pendingMessage: null,
      setPendingMessage: (pendingMessage) => set({ pendingMessage }),
      setPlan: (plan) => set({ plan, history: [] }),
      apply: (op) => {
        const { plan, history } = get();
        if (!plan) return null;
        const res = op(plan);
        if (res.ok) set({ plan: res.plan, history: [...history.slice(-29), plan] });
        return res;
      },
      undo: () => {
        const { history } = get();
        if (!history.length) return;
        set({ plan: history[history.length - 1], history: history.slice(0, -1) });
      },
      setChatOpen: (chatOpen) => set({ chatOpen }),
    }),
    { name: "lionplan", partialize: (s) => ({ plan: s.plan, chatOpen: s.chatOpen }) },
  ),
);

/** True once localStorage has been read, so we don't flash the wrong screen. */
export function useHydrated() {
  return useSyncExternalStore(
    (cb) => usePlanStore.persist.onFinishHydration(cb),
    () => usePlanStore.persist.hasHydrated(),
    () => false,
  );
}
