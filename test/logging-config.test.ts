import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/services/straumur-service", () => ({
  setupPaymentMethods: vi.fn(),
}));

// The rendered checkout is not under test here; only the class lifecycle around it is.
vi.mock("../src/features/straumur-checkout-container", () => ({ default: () => null }));

vi.mock("../src/adapter/straumur-adapter", () => ({
  getPaymentMethods: vi.fn(),
  createPaymentRequest: vi.fn(),
  createDetailsRequest: vi.fn(),
  postDisableTokenRequest: vi.fn(),
}));

import StraumurCheckout from "../src/straumur-checkout";
import { setupPaymentMethods } from "../src/services/straumur-service";
import { sendLogBatch } from "../src/logging/log-transport";
import { LogBatchBody, NOOP_LOGGER } from "../src/logging/component-logger";
import { getLogIdentifier } from "../src/config/build-checkout-configuration";
import { StraumurCheckoutConfiguration, StraumurWebConfiguration } from "../src/models/models";
import { advancedConfig } from "./helpers/fixtures";

const send = vi.mocked(sendLogBatch);
const setup = vi.mocked(setupPaymentMethods);

const configurationOf = (checkout: StraumurCheckout) =>
  (checkout as unknown as { configuration: StraumurCheckoutConfiguration }).configuration;

const asPublic = (config: unknown) => config as StraumurWebConfiguration;

function sentBodies(): LogBatchBody[] {
  return send.mock.calls.map((call) => JSON.parse(call[1]) as LogBatchBody);
}

function sentTypes(): string[] {
  return sentBodies().flatMap((x) => x.logs.map((y) => y.type));
}

describe("logging configuration", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    send.mockClear();
    setup.mockReset();
    setup.mockResolvedValue({
      resultCode: "Success",
      clientKey: "ck",
      locale: "en-US",
      amount: 10,
      currency: "ISK",
      formattedAmount: "10 kr",
      minorUnitsAmount: 1000,
      merchantName: "m",
      paymentMethods: { paymentMethods: [], storedPaymentMethods: [] },
    } as never);
  });

  it("session mode sends the sessionId to the component-logs endpoint of the environment", () => {
    const checkout = new StraumurCheckout({ sessionId: "sess_1", environment: "test", locale: "en" });

    checkout.destroy();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBe(
      "https://checkout-api.staging.straumur.is/api/v1/embeddedcheckout/component-logs"
    );
    const body = sentBodies()[0];
    expect(body.sessionId).toBe("sess_1");
    expect(body).not.toHaveProperty("checkoutReference");
    expect(body.componentVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(body.context).toEqual({ mode: "session", locale: "en-US", theme: "light" });
  });

  it("uses the production host for the live environment", () => {
    const checkout = new StraumurCheckout({ sessionId: "sess_1", environment: "live" });

    checkout.destroy();

    expect(send.mock.calls[0][0]).toBe("https://greidslugatt.straumur.is/api/v1/embeddedcheckout/component-logs");
  });

  it("advanced mode sends the checkoutReference", () => {
    const checkout = new StraumurCheckout(asPublic(advancedConfig({ checkoutReference: "UC-HOSTED-1" })));

    checkout.destroy();

    const body = sentBodies()[0];
    expect(body.checkoutReference).toBe("UC-HOSTED-1");
    expect(body).not.toHaveProperty("sessionId");
  });

  it("advanced mode without a checkoutReference logs nothing and adds no listeners", async () => {
    const addListener = vi.spyOn(window, "addEventListener");
    const checkout = new StraumurCheckout(asPublic(advancedConfig()));

    await checkout.mount("#root");
    checkout.destroy();

    expect(configurationOf(checkout).logger).toBe(NOOP_LOGGER);
    expect(send).not.toHaveBeenCalled();
    expect(addListener.mock.calls.filter((x) => x[0] === "pagehide")).toHaveLength(0);
  });

  it("enableLogging: false logs nothing and adds no listeners", async () => {
    const addListener = vi.spyOn(window, "addEventListener");
    const addDocumentListener = vi.spyOn(document, "addEventListener");
    const checkout = new StraumurCheckout({ sessionId: "sess_1", environment: "test", enableLogging: false });

    await checkout.mount("#root");
    checkout.destroy();

    expect(configurationOf(checkout).logger).toBe(NOOP_LOGGER);
    expect(send).not.toHaveBeenCalled();
    expect(addListener.mock.calls.filter((x) => x[0] === "pagehide")).toHaveLength(0);
    expect(addDocumentListener.mock.calls.filter((x) => x[0] === "visibilitychange")).toHaveLength(0);
  });

  it("logging is on by default and listens for the page being hidden", () => {
    const addListener = vi.spyOn(window, "addEventListener");

    const checkout = new StraumurCheckout({ sessionId: "sess_1", environment: "test" });

    expect(configurationOf(checkout).logger).not.toBe(NOOP_LOGGER);
    expect(addListener.mock.calls.filter((x) => x[0] === "pagehide")).toHaveLength(1);
    checkout.destroy();
  });

  it("an unknown environment logs nothing", () => {
    const checkout = new StraumurCheckout(asPublic({ sessionId: "sess_1", environment: "staging" }));

    expect(configurationOf(checkout).logger).toBe(NOOP_LOGGER);
  });

  it("keeps the same logger across updateConfig and setLanguage, and refuses to replace it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const checkout = new StraumurCheckout({ sessionId: "sess_1", environment: "test" });
    const logger = configurationOf(checkout).logger;
    await checkout.mount("#root");
    const mountedConfiguration = configurationOf(checkout);

    checkout.updateConfig({ theme: "dark", ...({ logger: NOOP_LOGGER } as object) });
    checkout.setLanguage("en");

    expect(configurationOf(checkout)).not.toBe(mountedConfiguration);
    expect(configurationOf(checkout).logger).toBe(logger);
    checkout.destroy();
  });

  it("logs the lifecycle: mount, methods loaded, config changes by name only, destroy", async () => {
    setup.mockResolvedValue({
      resultCode: "Success",
      clientKey: "ck",
      locale: "en-US",
      paymentMethods: {
        paymentMethods: [{ type: "scheme" }, { type: "googlepay" }],
        storedPaymentMethods: [{ id: "8415" }],
      },
    } as never);
    const checkout = new StraumurCheckout({ sessionId: "sess_1", environment: "test", locale: "en" });

    await checkout.mount("#root");
    checkout.updateConfig({ placeholders: { cardNumber: "secret-placeholder" } });
    checkout.setLanguage("is");
    checkout.destroy();

    expect(sentTypes()).toEqual([
      "lifecycle.mount",
      "lifecycle.methodsLoaded",
      "lifecycle.updateConfig",
      "lifecycle.setLanguage",
      "lifecycle.updateConfig",
      "lifecycle.destroy",
    ]);
    const logs = sentBodies().flatMap((x) => x.logs);
    expect(logs[1].data).toEqual({ count: 3, methods: "scheme,googlepay,storedcard" });
    expect(logs[2].data).toEqual({ keys: "placeholders" });
    expect(logs[3].data).toEqual({ locale: "is" });
    expect(JSON.stringify(logs)).not.toContain("secret-placeholder");
    expect(JSON.stringify(logs)).not.toContain("8415");
  });

  it("logs a failed mount with its error key", async () => {
    setup.mockResolvedValue({ resultCode: "Error", error: "error.failedToInitializePaymentMethods" } as never);
    const checkout = new StraumurCheckout({ sessionId: "sess_1", environment: "test" });

    await checkout.mount("#root");
    checkout.destroy();

    const failed = sentBodies()
      .flatMap((x) => x.logs)
      .find((x) => x.type === "lifecycle.mountFailed");
    expect(failed?.data).toEqual({ errorKey: "error.failedToInitializePaymentMethods" });
  });

  it("logs a thrown mount and an invalid advanced configuration as mount failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    setup.mockRejectedValue(new Error("network"));
    const thrown = new StraumurCheckout({ sessionId: "sess_1", environment: "test" });
    await thrown.mount("#root");
    thrown.destroy();

    const invalid = new StraumurCheckout(
      asPublic(advancedConfig({ checkoutReference: "UC-1", clientKey: "" as never }))
    );
    await invalid.mount("#root");
    invalid.destroy();

    const failures = sentBodies()
      .flatMap((x) => x.logs)
      .filter((x) => x.type === "lifecycle.mountFailed")
      .map((x) => x.data.errorKey);
    expect(failures).toEqual([
      "error.failedToInitializePaymentMethods",
      "error.failedToInitializeStraumurWebComponent",
    ]);
  });

  it("logs the advanced-mode methods and a redirect return", async () => {
    const checkout = new StraumurCheckout(
      asPublic(
        advancedConfig({
          checkoutReference: "UC-1",
          onAdditionalDetails: (_state, actions) => actions.resolve({ resultCode: "Authorised" }),
        })
      )
    );
    await checkout.mount("#root");
    await checkout.submitDetails("redirect-result-secret", "pcr-1");
    checkout.destroy();

    const logs = sentBodies().flatMap((x) => x.logs);
    expect(logs.map((x) => x.type)).toEqual(
      expect.arrayContaining(["lifecycle.methodsLoaded", "payment.redirectReturn"])
    );
    expect(logs.find((x) => x.type === "payment.redirectReturn")?.data).toEqual({ hasPaymentCheckoutReference: true });
    expect(JSON.stringify(logs)).not.toContain("redirect-result-secret");
  });
});

describe("getLogIdentifier", () => {
  it("routes session mode to sessionId and advanced mode to checkoutReference", () => {
    expect(getLogIdentifier({ sessionId: "s", environment: "test" }, true)).toEqual({ sessionId: "s" });
    expect(getLogIdentifier(advancedConfig({ checkoutReference: "UC-1" }), false)).toEqual({
      checkoutReference: "UC-1",
    });
    expect(getLogIdentifier(advancedConfig({ checkoutReference: "" }), false)).toBeNull();
    expect(getLogIdentifier(advancedConfig(), false)).toBeNull();
  });
});
