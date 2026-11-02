import { describe, it, expect } from "vitest";
import { resolveApplePayButtonColor, resolveGooglePayButtonColor } from "../src/utils/wallet-button-theme";

describe("resolveGooglePayButtonColor", () => {
  it("follows the resolved theme when no override is given", () => {
    expect(resolveGooglePayButtonColor("light")).toBe("white");
    expect(resolveGooglePayButtonColor("dark")).toBe("black");
  });

  it("honours an explicit override regardless of theme", () => {
    expect(resolveGooglePayButtonColor("light", "dark")).toBe("black");
    expect(resolveGooglePayButtonColor("dark", "white")).toBe("white");
  });
});

describe("resolveApplePayButtonColor", () => {
  it("follows the resolved theme when no override is given", () => {
    // white-outline (not plain white) so the button stays visible on the light surface.
    expect(resolveApplePayButtonColor("light")).toBe("white-outline");
    expect(resolveApplePayButtonColor("dark")).toBe("black");
  });

  it("honours an explicit override regardless of theme", () => {
    expect(resolveApplePayButtonColor("dark", "light")).toBe("white-outline");
    expect(resolveApplePayButtonColor("light", "dark")).toBe("black");
  });
});
