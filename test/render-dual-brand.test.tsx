import { h } from "preact";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { RenderDualBrandComponent } from "../src/components/render-dual-brand/render-dual-brand";

const config = { brand1: "visa", brand1Name: "Visa", brand2: "cartebancaire", brand2Name: "Carte Bancaire" };

describe("RenderDualBrandComponent", () => {
  it("exposes the options as a radiogroup of radios with the selected one checked", () => {
    render(<RenderDualBrandComponent dualBrandConfiguration={config} selectedBrand="visa" onBrandClick={vi.fn()} />);

    expect(screen.getByRole("radiogroup")).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);

    const visa = screen.getByRole("radio", { name: "Visa" });
    const cb = screen.getByRole("radio", { name: "Carte Bancaire" });
    expect(visa.getAttribute("aria-checked")).toBe("true");
    expect(cb.getAttribute("aria-checked")).toBe("false");
  });

  it("makes each option keyboard-focusable", () => {
    render(<RenderDualBrandComponent dualBrandConfiguration={config} selectedBrand={null} onBrandClick={vi.fn()} />);
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio.getAttribute("tabindex")).toBe("0");
    }
  });

  it.each(["Enter", " "])("selects an option when %s is pressed", (key) => {
    const onBrandClick = vi.fn();
    render(
      <RenderDualBrandComponent dualBrandConfiguration={config} selectedBrand={null} onBrandClick={onBrandClick} />
    );

    fireEvent.keyDown(screen.getByRole("radio", { name: "Carte Bancaire" }), { key });

    expect(onBrandClick).toHaveBeenCalledTimes(1);
    // Enter/Space synthesize a real click on the option, so the dispatched event carries the
    // data-value Adyen's dualBrandingChangeHandler reads. (currentTarget is only live during
    // dispatch — assert on target, which persists after the event settles.)
    expect(onBrandClick.mock.calls[0][0].target.getAttribute("data-value")).toBe("cartebancaire");
  });

  it("does not select on other keys", () => {
    const onBrandClick = vi.fn();
    render(
      <RenderDualBrandComponent dualBrandConfiguration={config} selectedBrand={null} onBrandClick={onBrandClick} />
    );

    fireEvent.keyDown(screen.getByRole("radio", { name: "Visa" }), { key: "a" });

    expect(onBrandClick).not.toHaveBeenCalled();
  });
});
