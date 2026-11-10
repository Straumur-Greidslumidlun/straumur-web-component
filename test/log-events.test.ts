import { describe, it, expect } from "vitest";
import { LOG_EVENTS, MAX_FIELD_LENGTH, isLogEventType, sanitize } from "../src/logging/log-events";

const eventTypes = Object.keys(LOG_EVENTS);

// Keys that must never reach a log, with the kind of value they would carry in the widget.
const FORBIDDEN_PROBE = {
  encryptedCardNumber: "adyenjs_0_1_25$abc",
  encryptedSecurityCode: "adyenjs_0_1_25$def",
  data: { paymentMethod: { type: "scheme" } },
  action: { type: "threeDS2", token: "secret" },
  email: "shopper@example.com",
  shopperName: "Jon Jonsson",
  validationURL: "https://apple-pay-gateway.apple.com/paymentservices/startSession",
  storedPaymentMethodId: "8415",
};

describe("log event catalog", () => {
  it("gives every event a category matching its type prefix", () => {
    for (const type of eventTypes) {
      const { category } = LOG_EVENTS[type as keyof typeof LOG_EVENTS];

      expect(type.startsWith(`${category}.`)).toBe(true);
    }
  });

  it.each(eventTypes)("%s strips every forbidden key", (type) => {
    const result = sanitize(type, FORBIDDEN_PROBE);

    expect(result).not.toBeNull();
    for (const key of Object.keys(FORBIDDEN_PROBE)) {
      expect(result!.data).not.toHaveProperty(key);
    }
  });

  it.each(eventTypes)("%s drops an object paymentMethod even where paymentMethod is allowed", (type) => {
    const result = sanitize(type, { paymentMethod: { type: "scheme", encryptedCardNumber: "x" } });

    expect(result!.data).not.toHaveProperty("paymentMethod");
  });
});

describe("sanitize", () => {
  it("keeps allow-listed primitive fields and drops the rest", () => {
    const result = sanitize("payment.response", {
      resultCode: "Authorised",
      hasAction: false,
      paymentMethod: "scheme",
      action: { type: "redirect", url: "https://bank.example" },
      extra: "nope",
    });

    expect(result).toEqual({
      category: "payment",
      data: { resultCode: "Authorised", hasAction: false, paymentMethod: "scheme" },
    });
  });

  it("truncates strings to the maximum length", () => {
    const result = sanitize("lifecycle.mountFailed", { errorKey: "x".repeat(MAX_FIELD_LENGTH + 50) });

    expect(result!.data.errorKey).toHaveLength(MAX_FIELD_LENGTH);
  });

  it("keeps finite numbers and booleans, drops non-finite numbers, null and arrays", () => {
    expect(sanitize("lifecycle.methodsLoaded", { count: 3, methods: "scheme" })!.data).toEqual({
      count: 3,
      methods: "scheme",
    });
    expect(sanitize("lifecycle.methodsLoaded", { count: Number.NaN, methods: null })!.data).toEqual({});
    expect(sanitize("lifecycle.methodsLoaded", { count: Infinity, methods: ["scheme"] })!.data).toEqual({});
    expect(sanitize("ui.storeDetailsToggled", { checked: true })!.data).toEqual({ checked: true });
  });

  it("returns null for an unknown event type", () => {
    expect(sanitize("payment.cardNumberTyped", { value: "4111" })).toBeNull();
    expect(isLogEventType("toString")).toBe(false);
  });

  it("works without fields", () => {
    expect(sanitize("lifecycle.mount")).toEqual({ category: "lifecycle", data: {} });
  });
});
