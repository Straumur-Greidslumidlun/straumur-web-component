import { h } from "preact";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/preact";
import { useMediaQuery } from "../src/utils/custom-hooks/use-media-query";

function Probe({ query }: { query: string }) {
  const matches = useMediaQuery(query);
  return <span data-testid="m">{String(matches)}</span>;
}

type Listener = (e: { matches: boolean }) => void;

/** Install a controllable matchMedia and return a trigger to emit a change. */
function installMatchMedia(initial: boolean) {
  let listener: Listener | null = null;
  const mql = {
    matches: initial,
    addEventListener: (_: string, l: Listener) => {
      listener = l;
    },
    removeEventListener: () => {
      listener = null;
    },
  };
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  return {
    emit(matches: boolean) {
      mql.matches = matches;
      listener?.({ matches });
    },
  };
}

describe("useMediaQuery", () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it("returns the initial match state", () => {
    installMatchMedia(true);
    render(<Probe query="(max-width: 380px)" />);
    expect(screen.getByTestId("m").textContent).toBe("true");
  });

  it("updates when the media query change event fires", () => {
    const mm = installMatchMedia(false);
    render(<Probe query="(max-width: 380px)" />);
    expect(screen.getByTestId("m").textContent).toBe("false");

    act(() => mm.emit(true));
    expect(screen.getByTestId("m").textContent).toBe("true");
  });
});
