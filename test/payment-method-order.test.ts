import { describe, it, expect } from "vitest";
import { resolvePaymentMethodOrder, DEFAULT_PAYMENT_METHOD_ORDER } from "../src/utils/payment-method-order";

describe("resolvePaymentMethodOrder", () => {
  it("returns the default order when none is given", () => {
    expect(resolvePaymentMethodOrder(undefined)).toEqual(DEFAULT_PAYMENT_METHOD_ORDER);
  });

  it("honours the given order and appends omitted slots in the default order", () => {
    expect(resolvePaymentMethodOrder(["card", "googlepay"])).toEqual([
      "card",
      "googlepay",
      "instantpayments",
      "storedcard",
      "applepay",
    ]);
  });

  it("ignores unknown tokens and collapses duplicates to their first occurrence", () => {
    expect(resolvePaymentMethodOrder(["card", "bogus", "card", "instantpayments"])).toEqual([
      "card",
      "instantpayments",
      "storedcard",
      "googlepay",
      "applepay",
    ]);
  });
});
