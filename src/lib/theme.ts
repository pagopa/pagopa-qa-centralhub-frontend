"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const KEY = "qa-hub-theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Theme | null;
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initial = stored ?? preferred;
    apply(initial);
    setTheme(initial);
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      apply(next);
      localStorage.setItem(KEY, next);
      return next;
    });
  };

  return { theme, toggle };
}

function apply(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** The theme currently applied to the page, whoever changed it (toggle, stored choice, system). */
export function useActiveTheme(): Theme {
  return useSyncExternalStore(
    subscribeToTheme,
    () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"),
    () => "light",
  );
}

/** Sets the `theme` query parameter of an external URL (e.g. Grafana), keeping everything else as is. */
export function withTheme(url: string, theme: Theme): string {
  if (!url) return url;
  const hashAt = url.indexOf("#");
  const hash = hashAt === -1 ? "" : url.slice(hashAt);
  const base = hashAt === -1 ? url : url.slice(0, hashAt);
  const param = /([?&])theme=[^&]*/;
  if (param.test(base)) return base.replace(param, `$1theme=${theme}`) + hash;
  return `${base}${base.includes("?") ? "&" : "?"}theme=${theme}${hash}`;
}
