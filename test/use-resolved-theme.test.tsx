import { h } from "preact";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, act } from "@testing-library/preact";
import { useResolvedTheme } from "../src/utils/custom-hooks/use-resolved-theme";
import { Theme } from "../src/models/models";

function Probe({ theme }: { theme: Theme }) {
  const resolved = useResolvedTheme(theme);
  return <span data-testid="resolved">{resolved}</span>;
}

/** Install a controllable matchMedia stub; returns a setter that flips the match and notifies listeners. */
function stubMatchMedia(initialDark: boolean) {
  let matches = initialDark;
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  window.matchMedia = ((query: string) =>
    ({
      get matches() {
        return matches;
      },
      media: query,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;

  return (dark: boolean) => {
    matches = dark;
    listeners.forEach((cb) => cb({ matches: dark } as MediaQueryListEvent));
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useResolvedTheme", () => {
  it("returns the explicit theme unchanged", () => {
    const light = render(<Probe theme="light" />);
    expect(light.container.querySelector('[data-testid="resolved"]')?.textContent).toBe("light");

    const dark = render(<Probe theme="dark" />);
    expect(dark.container.querySelector('[data-testid="resolved"]')?.textContent).toBe("dark");
  });

  it("resolves system to the current prefers-color-scheme", () => {
    stubMatchMedia(true);
    const { getByTestId } = render(<Probe theme="system" />);
    expect(getByTestId("resolved").textContent).toBe("dark");
  });

  it("resolves system to light when the OS prefers light", () => {
    stubMatchMedia(false);
    const { getByTestId } = render(<Probe theme="system" />);
    expect(getByTestId("resolved").textContent).toBe("light");
  });

  it("updates live when the system preference changes", () => {
    const setDark = stubMatchMedia(false);
    const { getByTestId } = render(<Probe theme="system" />);
    expect(getByTestId("resolved").textContent).toBe("light");

    act(() => setDark(true));
    expect(getByTestId("resolved").textContent).toBe("dark");
  });
});
