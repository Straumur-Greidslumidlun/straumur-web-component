import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/preact";

// Diagnostics logging must not touch the network in tests (existing tests count fetch calls). Every test
// gets a transport that reports success; test/log-transport.test.ts unmocks it to test the real one.
vi.mock("../src/logging/log-transport", () => ({
  LOG_REQUEST_TIMEOUT_MS: 10_000,
  sendLogBatch: vi.fn(async () => true),
}));

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
