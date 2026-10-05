import { h } from "preact";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { RenderDualBrandComponent } from "../src/components/render-dual-brand/render-dual-brand";

const config = { brand1: "visa", brand1Name: "Visa", brand2: "cartebancaire", brand2Name: "Carte Bancaire" };

describe("RenderDualBrandComponent", () => {
  it("exposes the options as a radiogroup of radios with the selected one checked", () => {
    render(
      <RenderDualBrandComponent
        dualBrandConfiguration={config}
        selectedBrand="visa"
        onBrandClick={vi.fn()}
        label="Card brand"
      />
    );

    expect(screen.getByRole("radiogroup")).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);

    const visa = screen.getByRole("radio", { name: "Visa" });
    const cb = screen.getByRole("radio", { name: "Carte Bancaire" });
    expect(visa.getAttribute("aria-checked")).toBe("true");
    expect(cb.getAttribute("aria-checked")).toBe("false");
  });

  it("has one tab stop: the selected option, or the first while none is selected", () => {
    const { rerender } = render(
      <RenderDualBrandComponent
        dualBrandConfiguration={config}
        selectedBrand={null}
        onBrandClick={vi.fn()}
        label="Card brand"
      />
    );
    const tabIndexes = () => screen.getAllByRole("radio").map((radio) => radio.getAttribute("tabindex"));
    expect(tabIndexes()).toEqual(["0", "-1"]);

    rerender(
      <RenderDualBrandComponent
        dualBrandConfiguration={config}
        selectedBrand="cartebancaire"
        onBrandClick={vi.fn()}
        label="Card brand"
      />
    );
    expect(tabIndexes()).toEqual(["-1", "0"]);
  });

  it.each(["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"])(
    "%s moves focus to the other option and selects it",
    (key) => {
      const onBrandClick = vi.fn();
      render(
        <RenderDualBrandComponent
          dualBrandConfiguration={config}
          selectedBrand="visa"
          onBrandClick={onBrandClick}
          label="Card brand"
        />
      );
      const cb = screen.getByRole("radio", { name: "Carte Bancaire" });

      fireEvent.keyDown(screen.getByRole("radio", { name: "Visa" }), { key });

      expect(document.activeElement).toBe(cb);
      expect(onBrandClick.mock.calls[0][0].target.getAttribute("data-value")).toBe("cartebancaire");
    }
  );

  it("names the group with the caller's (localized) label", () => {
    render(
      <RenderDualBrandComponent
        dualBrandConfiguration={config}
        selectedBrand={null}
        onBrandClick={vi.fn()}
        label="Kortategund"
      />
    );
    expect(screen.getByRole("radiogroup", { name: "Kortategund" })).toBeTruthy();
  });

  it.each(["Enter", " "])("selects an option when %s is pressed", (key) => {
    const onBrandClick = vi.fn();
    render(
      <RenderDualBrandComponent
        dualBrandConfiguration={config}
        selectedBrand={null}
        onBrandClick={onBrandClick}
        label="Card brand"
      />
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
      <RenderDualBrandComponent
        dualBrandConfiguration={config}
        selectedBrand={null}
        onBrandClick={onBrandClick}
        label="Card brand"
      />
    );

    fireEvent.keyDown(screen.getByRole("radio", { name: "Visa" }), { key: "a" });

    expect(onBrandClick).not.toHaveBeenCalled();
  });
});
