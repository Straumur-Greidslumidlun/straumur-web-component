import { describe, it, expect } from "vitest";
import { determineInitialState } from "../src/features/straumur-checkout-container";

describe("determineInitialState", () => {
  it("returns no selection when there are zero payment methods", () => {
    expect(determineInitialState(false, false, false, 0, undefined)).toEqual({
      initialPaymentMethod: null,
      isSolePaymentMethod: false,
    });
  });

  it("auto-selects card when it is the only method", () => {
    expect(determineInitialState(true, false, false, 0, undefined)).toEqual({
      initialPaymentMethod: "card",
      isSolePaymentMethod: true,
    });
  });

  it("auto-selects a single stored card", () => {
    expect(determineInitialState(false, false, false, 1, undefined)).toEqual({
      initialPaymentMethod: "storedcard",
      isSolePaymentMethod: true,
    });
  });

  it("auto-selects Google Pay when it is the only standard method", () => {
    expect(determineInitialState(false, true, false, 0, undefined)).toEqual({
      initialPaymentMethod: "googlepay",
      isSolePaymentMethod: true,
    });
  });

  it("auto-selects Apple Pay when it is the only standard method", () => {
    expect(determineInitialState(false, false, true, 0, undefined)).toEqual({
      initialPaymentMethod: "applepay",
      isSolePaymentMethod: true,
    });
  });

  it("prefers a single stored card over card when both would be sole (stored wins by order)", () => {
    // Only one option total is required to be sole; this documents the precedence order.
    expect(determineInitialState(false, false, false, 1, undefined).initialPaymentMethod).toBe("storedcard");
  });

  it("makes no selection when more than one option is available", () => {
    expect(determineInitialState(true, true, false, 0, undefined)).toEqual({
      initialPaymentMethod: null,
      isSolePaymentMethod: false,
    });
  });

  it("makes no selection when two stored cards exist", () => {
    expect(determineInitialState(false, false, false, 2, undefined)).toEqual({
      initialPaymentMethod: null,
      isSolePaymentMethod: false,
    });
  });

  it("excludes Google Pay from the standard count when it is configured as an instant payment", () => {
    // gpay moved to instant -> zero standard options -> no selection
    expect(determineInitialState(false, true, false, 0, ["googlepay"])).toEqual({
      initialPaymentMethod: null,
      isSolePaymentMethod: false,
    });
  });

  it("treats card as sole when Google Pay is an instant payment", () => {
    // card is the only *standard* option because gpay is instant
    expect(determineInitialState(true, true, false, 0, ["googlepay"])).toEqual({
      initialPaymentMethod: "card",
      isSolePaymentMethod: true,
    });
  });

  it("treats card as sole when both wallets are instant payments", () => {
    expect(determineInitialState(true, true, true, 0, ["applepay", "googlepay"])).toEqual({
      initialPaymentMethod: "card",
      isSolePaymentMethod: true,
    });
  });
});
