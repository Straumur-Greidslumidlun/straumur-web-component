import { describe, it, expect } from "vitest";
import { resolvePaymentMethodOrder, DEFAULT_PAYMENT_METHOD_ORDER } from "../src/utils/payment-method-order";

describe("resolvePaymentMethodOrder", () => {
  it("returns the default order when none is given", () => {
    expect(resolvePaymentMethodOrder(undefined)).toEqual(DEFAULT_PAYMENT_METHOD_ORDER);
  });

  it("leads the radio list with Kortalán, below the express strip", () => {
    // Design puts Kortalán at the top of the radio rows; "instantpayments" is the express-button
    // strip above them, not a radio, so it still comes first overall.
    expect(DEFAULT_PAYMENT_METHOD_ORDER[0]).toBe("instantpayments");
    expect(DEFAULT_PAYMENT_METHOD_ORDER[1]).toBe("kortalan");
  });

  it("honours the given order and appends omitted slots in the default order", () => {
    expect(resolvePaymentMethodOrder(["card", "googlepay"])).toEqual([
      "card",
      "googlepay",
      "instantpayments",
      "kortalan",
      "storedcard",
      "applepay",
    ]);
  });

  it("ignores unknown tokens and collapses duplicates to their first occurrence", () => {
    expect(resolvePaymentMethodOrder(["card", "bogus", "card", "instantpayments"])).toEqual([
      "card",
      "instantpayments",
      "kortalan",
      "storedcard",
      "googlepay",
      "applepay",
    ]);
  });
});
