import { describe, it, expect, vi } from "vitest";
import { buildCheckoutConfiguration } from "../src/config/build-checkout-configuration";
import { StraumurWebConfiguration } from "../src/models/models";
import { advancedConfig } from "./helpers/fixtures";

vi.mock("../src/adapter/straumur-adapter", () => ({
  getPaymentMethods: vi.fn(),
  createPaymentRequest: vi.fn(),
  createDetailsRequest: vi.fn(),
  postDisableTokenRequest: vi.fn(),
}));

const asPublic = (config: unknown) => config as StraumurWebConfiguration;

describe("buildCheckoutConfiguration", () => {
  it("builds a session configuration with the fixed country code and a session flow", () => {
    const result = buildCheckoutConfiguration({ sessionId: "s1", environment: "test", locale: "en" });

    expect(result.configuration).toMatchObject({
      mode: "session",
      sessionId: "s1",
      environment: "test",
      countryCode: "IS",
      locale: "en-US",
    });
    expect(result.configuration.paymentFlow.submitPayment).toBeTypeOf("function");
    expect(result.configuration.paymentFlow.disableToken).toBeTypeOf("function");
    expect(result.advancedConfiguration).toBeNull();
    expect(result.paymentMethods).toBeNull();
    expect(result.initializationFailed).toBe(false);
  });

  it("defaults the locale to Icelandic", () => {
    const result = buildCheckoutConfiguration({ sessionId: "s1", environment: "test" });

    expect(result.configuration.locale).toBe("is-IS");
  });

  it("defaults the theme to light and passes through an explicit theme", () => {
    expect(buildCheckoutConfiguration({ sessionId: "s1", environment: "test" }).configuration.theme).toBe("light");
    expect(
      buildCheckoutConfiguration({ sessionId: "s1", environment: "test", theme: "dark" }).configuration.theme
    ).toBe("dark");
  });

  it("propagates hideSubmitButton, onCardValidityChanged, and allowedPaymentMethods to the internal config", () => {
    const onCardValidityChanged = vi.fn();

    const result = buildCheckoutConfiguration({
      sessionId: "s1",
      environment: "test",
      hideSubmitButton: true,
      onCardValidityChanged,
      allowedPaymentMethods: ["card", "googlepay"],
    });

    expect(result.configuration.hideSubmitButton).toBe(true);
    expect(result.configuration.onCardValidityChanged).toBe(onCardValidityChanged);
    expect(result.configuration.allowedPaymentMethods).toEqual(["card", "googlepay"]);
  });

  it("detects a valid advanced configuration and normalizes its payment methods", () => {
    const config = advancedConfig({ countryCode: "DE", amount: { value: 2500, currency: "EUR" }, locale: "en" });

    const result = buildCheckoutConfiguration(asPublic(config));

    expect(result.configuration).toMatchObject({ mode: "advanced", countryCode: "DE", locale: "en-US" });
    expect(result.advancedConfiguration).toBe(config);
    expect(result.paymentMethods).toMatchObject({
      resultCode: "Success",
      minorUnitsAmount: 2500,
      amount: 25,
      currency: "EUR",
      locale: "en-US",
    });
    expect(result.initializationFailed).toBe(false);
  });

  it("marks an invalid advanced configuration as failed initialization", () => {
    const result = buildCheckoutConfiguration(asPublic(advancedConfig({ clientKey: "" })));

    expect(result.configuration.mode).toBe("advanced");
    expect(result.advancedConfiguration).toBeNull();
    expect(result.paymentMethods).toBeNull();
    expect(result.initializationFailed).toBe(true);
  });

  it("wires the advanced flow's disableToken only when the host provides onDisableToken", () => {
    const without = buildCheckoutConfiguration(asPublic(advancedConfig()));
    const withToken = buildCheckoutConfiguration(asPublic(advancedConfig({ onDisableToken: vi.fn() })));

    expect(without.configuration.paymentFlow.disableToken).toBeUndefined();
    expect(withToken.configuration.paymentFlow.disableToken).toBeTypeOf("function");
  });
});
