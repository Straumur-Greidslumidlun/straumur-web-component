import { h } from "preact";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { Tooltip } from "../src/components/tooltip/tooltip";

describe("Tooltip", () => {
  it("with a label: opens on keyboard focus, is described by role=tooltip, closes on Escape", () => {
    render(
      <Tooltip content="3-digit on the back of the card" label="3-digit on the back of the card">
        <span>i</span>
      </Tooltip>
    );
    const trigger = screen.getByRole("button", { name: "3-digit on the back of the card" });

    fireEvent.focus(trigger);
    const tooltip = screen.getByRole("tooltip");
    expect(trigger.getAttribute("aria-describedby")).toBe(tooltip.id);

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("with a label: a tap (focus + click) leaves it open; tapping elsewhere (blur) closes it", () => {
    render(
      <Tooltip content="hint" label="info">
        <span>i</span>
      </Tooltip>
    );
    const trigger = screen.getByRole("button", { name: "info" });

    fireEvent.focus(trigger);
    fireEvent.click(trigger);
    expect(screen.getByRole("tooltip")).toBeTruthy();

    fireEvent.blur(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("without a label: hover-only, not in the tab order", () => {
    const { container } = render(
      <Tooltip content="more brands">
        <span>+2</span>
      </Tooltip>
    );

    expect(screen.queryByRole("button")).toBeNull();
    fireEvent.mouseEnter(container.firstElementChild!.firstElementChild!);
    expect(screen.getByRole("tooltip").textContent).toBe("more brands");
  });
});
