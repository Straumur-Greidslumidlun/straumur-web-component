import { describe, it, expect } from "vitest";
import { normalizeAdvancedConfiguration } from "../src/services/advanced-normalizer";
import { advancedConfig } from "./helpers/fixtures";

describe("normalizeAdvancedConfiguration", () => {
  it("shapes the advanced configuration into a session-style Success response", () => {
    const config = advancedConfig({
      clientKey: "client-key-1",
      paymentMethods: { paymentMethods: [{ type: "scheme", name: "Cards", brands: ["visa"] }] },
      amount: { value: 2599, currency: "EUR" },
      formattedAmount: "€25.99",
      merchantName: "Shop",
      enableStoreDetails: "AskForConsent",
    });

    const result = normalizeAdvancedConfiguration(config, "en-US");

    expect(result).toEqual({
      resultCode: "Success",
      clientKey: "client-key-1",
      paymentMethods: { paymentMethods: [{ type: "scheme", name: "Cards", brands: ["visa"] }] },
      minorUnitsAmount: 2599,
      currency: "EUR",
      amount: 25.99,
      formattedAmount: "€25.99",
      merchantName: "Shop",
      enableStoreDetails: "AskForConsent",
      locale: "en-US",
    });
  });

  it("converts the minor-units amount to major units", () => {
    const result = normalizeAdvancedConfiguration(
      advancedConfig({ amount: { value: 1000, currency: "ISK" } }),
      "is-IS"
    );

    expect(result.minorUnitsAmount).toBe(1000);
    expect(result.amount).toBe(10);
  });

  it("uses the resolved internal locale, not the configuration's public locale", () => {
    const result = normalizeAdvancedConfiguration(advancedConfig({ locale: "en" }), "is-IS");

    expect(result.locale).toBe("is-IS");
  });
});
