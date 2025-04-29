import { useEffect, useState } from "preact/hooks";

/**
 * Hook to listen for a CSS media query.
 * @param query - The media query string (e.g., '(min-width: 768px)')
 * @returns true if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const getMatch = () => window.matchMedia(query).matches;

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Initial match check
    setMatches(mediaQueryList.matches);

    // Listen for changes
    mediaQueryList.addEventListener("change", listener);

    return () => {
      mediaQueryList.removeEventListener("change", listener);
    };
  }, [query]);

  return matches;
}
