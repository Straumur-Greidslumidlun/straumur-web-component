import { h } from "preact";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/preact";
import { LoaderScreen } from "../src/components/shared/status-screen";

describe("loaders", () => {
  it("expose an accessible name instead of an unlabeled spinner", () => {
    render(<LoaderScreen label="Loading…" />);

    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Loading…");
    // The SVG itself is decorative.
    expect(status.querySelector("svg")!.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
