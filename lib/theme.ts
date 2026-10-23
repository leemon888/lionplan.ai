"use client";

import { useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark" | "system";
import { THEME_KEY as KEY } from "./theme-script";

const listeners = new Set<() => void>();

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

export function setThemePref(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {}
  apply(pref);
  listeners.forEach((l) => l());
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const mq = matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => readPref() === "system" && apply("system");
      mq.addEventListener("change", onChange);
      return () => {
        listeners.delete(cb);
        mq.removeEventListener("change", onChange);
      };
    },
    readPref,
    () => "system",
  );
}
