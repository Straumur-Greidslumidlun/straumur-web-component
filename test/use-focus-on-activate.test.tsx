import { h } from "preact";
import { useRef } from "preact/hooks";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/preact";
import { useFocusOnActivate } from "../src/utils/custom-hooks/use-focus-on-activate";

function Probe({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusOnActivate(ref, active);
  return <div ref={ref} tabIndex={-1} data-testid="target" />;
}

describe("useFocusOnActivate", () => {
  it("does not focus while inactive", () => {
    const { getByTestId } = render(<Probe active={false} />);
    expect(document.activeElement).not.toBe(getByTestId("target"));
  });

  it("moves focus to the target when it becomes active", () => {
    const { getByTestId, rerender } = render(<Probe active={false} />);
    rerender(<Probe active={true} />);
    expect(document.activeElement).toBe(getByTestId("target"));
  });

  it("does not re-steal focus on re-renders while it stays active", () => {
    const { getByTestId, rerender } = render(<Probe active={true} />);
    const target = getByTestId("target");
    expect(document.activeElement).toBe(target);

    // Move focus elsewhere, then re-render still-active — focus must not be yanked back.
    const other = document.createElement("input");
    document.body.appendChild(other);
    other.focus();
    rerender(<Probe active={true} />);
    expect(document.activeElement).toBe(other);
    other.remove();
  });
});
