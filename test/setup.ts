import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/preact";

// jsdom does not implement matchMedia; provide a default (non-matching) stub so components
// using useMediaQuery render. Individual tests can override window.matchMedia as needed.
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

// Unmount any Preact trees rendered during a test, then reset mocks. Vitest 4's restoreAllMocks only
// restores vi.spyOn spies; resetAllMocks keeps the Vitest 3 behaviour of clearing vi.fn() call history
// and per-test implementation overrides between tests.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});
