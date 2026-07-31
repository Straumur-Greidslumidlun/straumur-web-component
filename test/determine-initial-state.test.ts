import { describe, it, expect } from "vitest";
import { determineInitialState } from "../src/features/straumur-checkout-container";

// Args: (hasCard, hasGooglePay, hasApplePay, hasKortalan, storedCount, instantPayments, openDefaultPaymentMethod?)
describe("determineInitialState", () => {
  it("returns no selection when there are zero payment methods", () => {
    expect(determineInitialState(false, false, false, false, 0, undefined)).toEqual({
      initialPaymentMethod: null,
      isSolePaymentMethod: false,
    });
  });

  it("auto-selects card when it is the only method", () => {
    expect(determineInitialState(true, false, false, false, 0, undefined)).toEqual({
      initialPaymentMethod: "card",
      isSolePaymentMethod: true,
    });
  });

  it("auto-selects a single stored card", () => {
    expect(determineInitialState(false, false, false, false, 1, undefined)).toEqual({
      initialPaymentMethod: "storedcard",
      isSolePaymentMethod: true,
    });
  });

  it("auto-selects Google Pay when it is the only standard method", () => {
    expect(determineInitialState(false, true, false, false, 0, undefined)).toEqual({
      initialPaymentMethod: "googlepay",
      isSolePaymentMethod: true,
    });
  });

  it("auto-selects Apple Pay when it is the only standard method", () => {
    expect(determineInitialState(false, false, true, false, 0, undefined)).toEqual({
      initialPaymentMethod: "applepay",
      isSolePaymentMethod: true,
    });
  });

  it("auto-selects Kortalán when it is the only method", () => {
    expect(determineInitialState(false, false, false, true, 0, undefined)).toEqual({
      initialPaymentMethod: "kortalan",
      isSolePaymentMethod: true,
    });
  });

  it("prefers a single stored card over card when both would be sole (stored wins by order)", () => {
    // Only one option total is required to be sole; this documents the precedence order.
    expect(determineInitialState(false, false, false, false, 1, undefined).initialPaymentMethod).toBe("storedcard");
  });

  it("makes no selection when more than one option is available", () => {
    expect(determineInitialState(true, true, false, false, 0, undefined)).toEqual({
      initialPaymentMethod: null,
      isSolePaymentMethod: false,
    });
  });

  it("makes no selection when card and Kortalán are both available", () => {
    expect(determineInitialState(true, false, false, true, 0, undefined)).toEqual({
      initialPaymentMethod: null,
      isSolePaymentMethod: false,
    });
  });

  it("makes no selection when two stored cards exist", () => {
    expect(determineInitialState(false, false, false, false, 2, undefined)).toEqual({
      initialPaymentMethod: null,
      isSolePaymentMethod: false,
    });
  });

  it("excludes Google Pay from the standard count when it is configured as an instant payment", () => {
    // gpay moved to instant -> zero standard options -> no selection
    expect(determineInitialState(false, true, false, false, 0, ["googlepay"])).toEqual({
      initialPaymentMethod: null,
      isSolePaymentMethod: false,
    });
  });

  it("treats Kortalán as sole when Google Pay is an instant payment", () => {
    // Kortalán is the only *standard* option because gpay is instant
    expect(determineInitialState(false, true, false, true, 0, ["googlepay"])).toEqual({
      initialPaymentMethod: "kortalan",
      isSolePaymentMethod: true,
    });
  });

  it("treats card as sole when Google Pay is an instant payment", () => {
    // card is the only *standard* option because gpay is instant
    expect(determineInitialState(true, true, false, false, 0, ["googlepay"])).toEqual({
      initialPaymentMethod: "card",
      isSolePaymentMethod: true,
    });
  });

  it("treats card as sole when both wallets are instant payments", () => {
    expect(determineInitialState(true, true, true, false, 0, ["applepay", "googlepay"])).toEqual({
      initialPaymentMethod: "card",
      isSolePaymentMethod: true,
    });
  });

  it("excludes Kortalán from the standard count when it is configured as an instant payment", () => {
    // kortalan moved to instant -> zero standard options -> no selection
    expect(determineInitialState(false, false, false, true, 0, ["kortalan"])).toEqual({
      initialPaymentMethod: null,
      isSolePaymentMethod: false,
    });
  });

  it("treats card as sole when Kortalán is an instant payment", () => {
    // card is the only *standard* option because kortalan is instant
    expect(determineInitialState(true, false, false, true, 0, ["kortalan"])).toEqual({
      initialPaymentMethod: "card",
      isSolePaymentMethod: true,
    });
  });

  it("treats Kortalán as sole when both wallets are instant payments", () => {
    // kortalan is the only *standard* option because both wallets are instant
    expect(determineInitialState(false, true, true, true, 0, ["googlepay", "applepay"])).toEqual({
      initialPaymentMethod: "kortalan",
      isSolePaymentMethod: true,
    });
  });
});

describe("determineInitialState — openDefaultPaymentMethod", () => {
  it("opens the requested standalone wallet in multi-method mode", () => {
    expect(determineInitialState(true, true, false, false, 0, undefined, "googlepay")).toEqual({
      initialPaymentMethod: "googlepay",
      isSolePaymentMethod: false,
    });
  });

  it("opens a stored card when firstStoredCard is requested and saved cards exist", () => {
    expect(determineInitialState(true, false, false, false, 2, undefined, "firstStoredCard")).toEqual({
      initialPaymentMethod: "storedcard",
      isSolePaymentMethod: false,
    });
  });

  it("opens nothing when the requested wallet is an instant payment", () => {
    // gpay is instant (not standalone); card + standalone applepay keep it multi-method.
    expect(determineInitialState(true, true, true, false, 0, ["googlepay"], "googlepay")).toEqual({
      initialPaymentMethod: null,
      isSolePaymentMethod: false,
    });
  });

  it("opens nothing when firstStoredCard is requested but no cards are saved", () => {
    expect(determineInitialState(true, true, false, false, 0, undefined, "firstStoredCard")).toEqual({
      initialPaymentMethod: null,
      isSolePaymentMethod: false,
    });
  });

  it("opens nothing when the requested method is unavailable and there is no card", () => {
    // gpay is instant (not standalone), no card; applepay + a stored card keep it multi-method.
    expect(determineInitialState(false, true, true, false, 1, ["googlepay"], "googlepay")).toEqual({
      initialPaymentMethod: null,
      isSolePaymentMethod: false,
    });
  });

  it("ignores openDefaultPaymentMethod in sole mode", () => {
    expect(determineInitialState(true, false, false, false, 0, undefined, "googlepay")).toEqual({
      initialPaymentMethod: "card",
      isSolePaymentMethod: true,
    });
  });
});
