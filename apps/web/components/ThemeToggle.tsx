"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "pf-theme";

/**
 * Runs before first paint to stop the page flashing the wrong theme.
 *
 * Injected as a blocking inline script in the document head: React hasn't
 * hydrated yet at that point, so this is the only place the stored preference
 * can be applied without a visible flash.
 */
export const NO_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;

function apply(theme: Theme) {
  const root = document.documentElement;
  // Removing the attribute hands control back to prefers-color-scheme.
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

function read(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* Storage can be unavailable in private mode, fall back to system. */
  }
  return "system";
}

const ORDER: Theme[] = ["light", "dark", "system"];

const LABEL: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function ThemeToggle() {
  // `null` until mounted: the server has no way to know the stored preference,
  // so rendering a specific icon during SSR would guarantee a hydration
  // mismatch. The button reserves its space and fills in on mount.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(read());
  }, []);

  const cycle = () => {
    const current = theme ?? "system";
    const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!;
    setTheme(next);
    apply(next);
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* Preference just won't persist. The page still themes correctly. */
    }
  };

  return (
    <button
      type="button"
      onClick={cycle}
      // Announce the current state; the cycle order is discoverable by using it.
      aria-label={theme ? `Theme: ${LABEL[theme]}. Click to change.` : "Change theme"}
      title={theme ? `Theme: ${LABEL[theme]}` : "Change theme"}
      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-line text-muted transition-colors hover:border-accent hover:text-accent"
    >
      <span aria-hidden className="block">
        {theme === "light" ? <SunIcon /> : theme === "dark" ? <MoonIcon /> : <SystemIcon />}
      </span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
