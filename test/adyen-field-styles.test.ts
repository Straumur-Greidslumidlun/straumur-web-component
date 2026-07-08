import { describe, it, expect } from "vitest";
import { getAdyenFieldStyles } from "../src/utils/adyen-field-styles";

describe("getAdyenFieldStyles", () => {
  it("returns light field colors for the light theme", () => {
    const styles = getAdyenFieldStyles("light");
    expect(styles.base.color).toBe("#00112c");
    expect(styles.placeholder.color).toBe("#72889d");
    expect(styles.error.color).toBe("#d96666");
  });

  it("returns light-on-dark field colors for the dark theme", () => {
    const styles = getAdyenFieldStyles("dark");
    // Text must be light so it is legible on the dark field background.
    expect(styles.base.color).toBe("#e8edf2");
    expect(styles.placeholder.color).toBe("#9aa7b5");
    expect(styles.error.color).toBe("#e08a8a");
  });
});
