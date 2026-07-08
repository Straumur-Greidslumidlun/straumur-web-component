import { useEffect, useState } from "preact/hooks";
import { ResolvedTheme, Theme } from "../../models/models";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(DARK_QUERY).matches
    : false;
}

/**
 * Resolves a Theme to the concrete "light" | "dark" applied to the DOM.
 *
 * For "system" it reads `prefers-color-scheme` and subscribes to changes, so the widget
 * flips live when the shopper switches their OS/browser appearance. For explicit
 * "light"/"dark" it returns that value and attaches no listener.
 */
export function useResolvedTheme(theme: Theme): ResolvedTheme {
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);

    // Re-sync in case the preference changed between mount and effect.
    setSystemDark(query.matches);
    query.addEventListener("change", onChange);

    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  if (theme === "system") {
    return systemDark ? "dark" : "light";
  }

  return theme;
}
