import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/preact";

// jsdom does not implement matchMedia; provide a default (non-matching) stub so components
// using it (useResolvedTheme for theme: "system") render. Individual tests can override window.matchMedia as needed.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// Unmount any Preact trees rendered during a test.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
