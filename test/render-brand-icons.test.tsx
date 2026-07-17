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

  it("renders the boxed multicolor mark on the light theme (Visa)", () => {
    const { container } = render(<RenderBrandIcon brand="visa" theme="light" />);
    // The full-viewBox white background rect and the Visa-blue wordmark are present.
    expect(container.querySelector('path[d="M0 0h40v26H0z"]')).toBeTruthy();
    expect(container.querySelector('path[fill="#1434CB"]')).toBeTruthy();
  });

  it("renders the reversed mark on the dark theme (Visa): no white box, white ink", () => {
    const { container } = render(<RenderBrandIcon brand="visa" theme="dark" />);
    expect(container.querySelector('path[d="M0 0h40v26H0z"]')).toBeNull();
    expect(container.querySelector('path[fill="#1434CB"]')).toBeNull();
    expect(container.querySelector('path[fill="#fff"]')).toBeTruthy();
  });

  it("drops the white box for Mastercard/Maestro on dark, keeping the colored circles", () => {
    const mc = render(<RenderBrandIcon brand="mc" theme="dark" />);
    expect(mc.container.querySelector('path[d="M0 0h40v26H0z"]')).toBeNull();
    // The orange/red/yellow circles are still drawn.
    expect(mc.container.querySelector('path[fill="#F06022"]')).toBeTruthy();
  });

  it("flips the Discover wordmark to white on dark", () => {
    const light = render(<RenderBrandIcon brand="discover" theme="light" />);
    expect(light.container.querySelector('path[fill="#000"]')).toBeTruthy();
    const dark = render(<RenderBrandIcon brand="discover" theme="dark" />);
    expect(dark.container.querySelector('path[fill="#000"]')).toBeNull();
  });

  it("wraps chip-only brands (jcb/diners/cup) in a light chip on dark, but not on light", () => {
    ["jcb", "diners", "cup"].forEach((brand) => {
      const dark = render(<RenderBrandIcon brand={brand} theme="dark" />);
      expect(dark.container.querySelector(".straumur__brand-chip")).toBeTruthy();

      const light = render(<RenderBrandIcon brand={brand} theme="light" />);
      expect(light.container.querySelector(".straumur__brand-chip")).toBeNull();
    });
  });

  it("leaves Amex unchanged on dark (no chip, keeps its blue box)", () => {
    const { container } = render(<RenderBrandIcon brand="amex" theme="dark" />);
    expect(container.querySelector(".straumur__brand-chip")).toBeNull();
    expect(container.querySelector('path[fill="#016FD0"]')).toBeTruthy();
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
