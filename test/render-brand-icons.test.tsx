import { h } from "preact";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/preact";
import { RenderBrandIcons, RenderBrandIcon } from "../src/utils/renderBrandIcons";

const asBrands = (brands: string[]) => brands.map((brand) => ({ brand, brandFullName: brand }));

describe("RenderBrandIcon", () => {
  it("renders an svg for a known brand", () => {
    const { container } = render(<RenderBrandIcon brand="visa" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("falls back to the brand name text for an unknown brand", () => {
    render(<RenderBrandIcon brand="mystery-brand" />);
    expect(screen.getByText("mystery-brand")).toBeTruthy();
  });

  it("renders nothing for an unknown brand when defaultToBrandName is false", () => {
    const { container } = render(<RenderBrandIcon brand="mystery-brand" defaultToBrandName={false} />);
    expect(container.textContent).toBe("");
  });
});

describe("RenderBrandIcons", () => {
  it("renders one icon per brand", () => {
    const { container } = render(<RenderBrandIcons brands={asBrands(["visa", "mc"])} />);
    expect(container.querySelectorAll("svg").length).toBe(2);
  });

  it("hides brands listed in brandHidden", () => {
    const { container } = render(
      <RenderBrandIcons brands={asBrands(["visa", "mc"])} brandHidden={[{ brand: "visa" }]} />
    );
    // Only mastercard remains.
    expect(container.querySelectorAll("svg").length).toBe(1);
  });

  it("collapses brands beyond the limit into a +N overflow indicator", () => {
    render(<RenderBrandIcons brands={asBrands(["visa", "mc", "amex", "jcb", "diners"])} limit={3} />);
    // 5 brands, limit 3 -> "+2" overflow.
    expect(screen.getByText("+2")).toBeTruthy();
  });

  it("shows up to four brands before overflowing by default", () => {
    render(<RenderBrandIcons brands={asBrands(["visa", "mc", "maestro", "amex", "jcb"])} />);
    // 5 brands, default limit 4 -> "+1" overflow.
    expect(screen.getByText("+1")).toBeTruthy();
  });

  it("orders known brands by the preferred sequence, pushing unknown brands to the end", () => {
    const { container } = render(<RenderBrandIcons brands={asBrands(["mystery", "amex", "visa"])} />);
    const children = Array.from(container.children);
    // Preferred order is visa, mc, maestro, amex, jcb, cup, then anything unlisted.
    expect(children[0].tagName.toLowerCase()).toBe("svg"); // visa
    expect(children[1].tagName.toLowerCase()).toBe("svg"); // amex
    expect(children[2].textContent).toBe("mystery"); // unknown, last
  });

  it("keeps the original order among unlisted brands (stable sort)", () => {
    const { container } = render(<RenderBrandIcons brands={asBrands(["zeta", "alpha"])} />);
    const children = Array.from(container.children);
    expect(children[0].textContent).toBe("zeta");
    expect(children[1].textContent).toBe("alpha");
  });
});
