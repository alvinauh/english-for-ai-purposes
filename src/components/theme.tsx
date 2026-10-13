"use client";

import { useSyncExternalStore } from "react";

// Light / dark / auto (follow the device). Stored in localStorage and applied as data-theme on <html>.

type Choice = "light" | "dark" | "system";
const KEY = "pb.theme";

/** Runs in <head> before the page paints, so there is no flash of the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var c=localStorage.getItem("${KEY}");var d=c==="dark"||(c!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}})()`;

function read(): Choice {
  try {
    const c = localStorage.getItem(KEY);
    return c === "light" || c === "dark" ? c : "system";
  } catch {
    return "system";
  }
}

function apply(choice: Choice) {
  const dark = choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    if (read() === "system") apply("system");
    onChange();
  };
  mq.addEventListener("change", onSystem);
  window.addEventListener("pb-theme", onChange);
  return () => {
    mq.removeEventListener("change", onSystem);
    window.removeEventListener("pb-theme", onChange);
  };
}

const NEXT: Record<Choice, Choice> = { light: "dark", dark: "system", system: "light" };
const LABEL: Record<Choice, string> = { light: "☀ Light", dark: "☾ Dark", system: "◐ Auto" };

export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, read, () => "system" as Choice);
  return (
    <button
      onClick={() => {
        const next = NEXT[choice];
        try {
          if (next === "system") localStorage.removeItem(KEY);
          else localStorage.setItem(KEY, next);
        } catch {
          // storage blocked: the theme still changes for this page view
        }
        apply(next);
        window.dispatchEvent(new Event("pb-theme"));
      }}
      title="Switch light / dark mode"
      className="rounded-md border border-line bg-surface px-2 py-1 text-sm hover:bg-subtle"
    >
      {LABEL[choice]}
    </button>
  );
}
