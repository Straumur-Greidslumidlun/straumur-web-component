import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAdyenErrorHandler, createAdyenPaymentHandlers } from "../src/components/shared/create-adyen-handlers";
import { createBeforeSubmitClickHandler, submitCardWithGate } from "../src/components/shared/before-submit-click";
import { dispatchFinalResult } from "../src/components/shared/dispatch-final-result";
import { RequestTimeoutError } from "../src/adapter/request-timeout-error";
import { sendLogBatch } from "../src/logging/log-transport";
import { createComponentLogger, FLUSH_DELAY_MS, Logger, RETRY_DELAYS_MS } from "../src/logging/component-logger";
import { LogFields } from "../src/logging/log-events";
import { PaymentFlow } from "../src/models/models";
import { baseConfig } from "./helpers/fixtures";

type Recorded = { type: string; fields?: LogFields };

function recordingLogger(): Logger & { events: Recorded[]; types: () => string[] } {
  const events: Recorded[] = [];
  return {
    events,
    types: () => events.map((x) => x.type),
    log: (type, fields) => {
      events.push({ type, fields });
    },
    start: () => {},
    stop: () => {},
  };
}

const element = {} as never;
const actions = () => ({ resolve: vi.fn(), reject: vi.fn() });
const submitState = { data: { paymentMethod: { type: "scheme", encryptedCardNumber: "adyenjs_secret" } } } as never;
const detailsState = { data: { details: { threeDSResult: "secret-3ds-result" } } } as never;
const challengeAction = { type: "threeDS2", subtype: "challenge", token: "secret-action-token" };

function setup(flow: Partial<PaymentFlow>, logger: Logger = recordingLogger()) {
  const paymentFlow: PaymentFlow = {
    submitPayment: vi.fn().mockResolvedValue({ resultCode: "Authorised" }),
    submitAdditionalDetails: vi.fn().mockResolvedValue({ resultCode: "Authorised" }),
    ...flow,
  };
  const configuration = baseConfig({ paymentFlow, logger, onPaymentCompleted: vi.fn(), onPaymentFailed: vi.fn() });
  const options = {
    configuration,
    handleSuccess: vi.fn(),
    handleError: vi.fn(),
    setThreeDSecureActive: vi.fn(),
    paymentMethod: "card",
  };

  return { handlers: createAdyenPaymentHandlers(options), configuration, options, paymentFlow };
}

// Drives a card payment the way card-form does: the gate, then Adyen's onSubmit, then Adyen's final callback.
async function payWithCard(
  handlers: ReturnType<typeof setup>["handlers"],
  configuration: ReturnType<typeof setup>["configuration"]
) {
  const card = {
    isValid: true,
    submit: () => handlers.handleOnSubmit(submitState, element, actions()),
  };
  await submitCardWithGate(
    configuration.paymentFlow,
    () => card,
    { tryStart: () => true, release: () => {} },
    {
      logger: configuration.logger,
      paymentMethod: "card",
    }
  );
  await vi.waitFor(() => expect(configuration.paymentFlow.submitPayment).toHaveBeenCalled());
  await Promise.resolve();
}

describe("payment-flow instrumentation", () => {
  it("logs a frictionless card payment in order", async () => {
    const logger = recordingLogger();
    const { handlers, configuration } = setup({}, logger);

    await payWithCard(handlers, configuration);
    handlers.handlePaymentCompleted({ resultCode: "Authorised" } as never);

    expect(logger.types()).toEqual([
      "payment.beforeSubmit",
      "payment.submitted",
      "payment.response",
      "payment.finalResult",
    ]);
    expect(logger.events[0].fields).toEqual({ paymentMethod: "card", allowed: true, threw: false });
    expect(logger.events[2].fields).toEqual({
      paymentMethod: "card",
      resultCode: "Authorised",
      hasAction: false,
      actionType: undefined,
    });
    expect(logger.events[3].fields).toEqual({
      paymentMethod: "card",
      resultCode: "Authorised",
      screen: "success",
      hostCallbackThrew: false,
    });
  });

  it("logs a refused payment with the failure screen", async () => {
    const logger = recordingLogger();
    const { handlers, configuration } = setup(
      { submitPayment: vi.fn().mockResolvedValue({ resultCode: "Refused" }) },
      logger
    );

    await payWithCard(handlers, configuration);
    handlers.handlePaymentFailed({ resultCode: "Refused" } as never);

    expect(logger.events.at(-1)).toEqual({
      type: "payment.finalResult",
      fields: { paymentMethod: "card", resultCode: "Refused", screen: "failure", hostCallbackThrew: false },
    });
  });

  it("logs a 3DS challenge: response with the action type only, challenge shown, details submitted", async () => {
    const logger = recordingLogger();
    const { handlers, configuration } = setup(
      { submitPayment: vi.fn().mockResolvedValue({ resultCode: "ChallengeShopper", action: challengeAction }) },
      logger
    );

    await payWithCard(handlers, configuration);
    handlers.handleActionHandled({ componentType: "3DS2Fingerprint" } as never);
    handlers.handleActionHandled({ componentType: "3DS2Challenge" } as never);
    await handlers.handleOnSubmitAdditionalData(detailsState, element, actions());
    handlers.handlePaymentCompleted({ resultCode: "Authorised" } as never);

    expect(logger.types()).toEqual([
      "payment.beforeSubmit",
      "payment.submitted",
      "payment.response",
      "payment.threeDSChallengeShown",
      "payment.detailsSubmitted",
      "payment.response",
      "payment.finalResult",
    ]);
    expect(logger.events[2].fields).toMatchObject({
      resultCode: "ChallengeShopper",
      hasAction: true,
      actionType: "threeDS2",
    });
    expect(logger.events[3].fields).toEqual({ paymentMethod: "card", componentType: "3DS2Challenge" });

    const logged = JSON.stringify(logger.events);
    expect(logged).not.toContain("secret-action-token");
    expect(logged).not.toContain("secret-3ds-result");
    expect(logged).not.toContain("adyenjs_secret");
  });

  it("logs a timed-out and a failed request by stage", async () => {
    const logger = recordingLogger();
    const { handlers } = setup(
      {
        submitPayment: vi.fn().mockRejectedValue(new RequestTimeoutError("https://x/payment", 90_000)),
        submitAdditionalDetails: vi.fn().mockRejectedValue(new Error("500")),
      },
      logger
    );

    await handlers.handleOnSubmit(submitState, element, actions());
    await handlers.handleOnSubmitAdditionalData(detailsState, element, actions());

    expect(logger.events.filter((x) => x.type === "payment.timeout" || x.type === "payment.requestFailed")).toEqual([
      { type: "payment.timeout", fields: { paymentMethod: "card", stage: "payment" } },
      { type: "payment.requestFailed", fields: { paymentMethod: "card", stage: "details" } },
    ]);
    expect(JSON.stringify(logger.events)).not.toContain("https://x/payment");
  });

  it("records that the host's result callback threw, without changing the outcome", () => {
    const logger = recordingLogger();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const handleSuccess = vi.fn();

    dispatchFinalResult("Received", {
      configuration: {
        logger,
        onPaymentCompleted: () => {
          throw new Error("host bug");
        },
      },
      handleSuccess,
      handleError: vi.fn(),
    });

    expect(handleSuccess).toHaveBeenCalledWith({ key: "success.paymentPending" });
    expect(logger.events).toEqual([
      {
        type: "payment.finalResult",
        fields: { paymentMethod: undefined, resultCode: "Received", screen: "pending", hostCallbackThrew: true },
      },
    ]);
  });
});

describe("submit gate instrumentation", () => {
  const lock = { tryStart: () => true, release: vi.fn() };
  const flow = (beforeSubmit?: PaymentFlow["beforeSubmit"]) =>
    ({ submitPayment: vi.fn(), submitAdditionalDetails: vi.fn(), beforeSubmit }) as PaymentFlow;

  it("logs why a card submission was blocked", async () => {
    const logger = recordingLogger();
    const log = { logger, paymentMethod: "storedcard" };

    await submitCardWithGate(flow(), () => null, lock, log);
    await submitCardWithGate(flow(), () => ({ submit: vi.fn() }), { tryStart: () => false, release: vi.fn() }, log);
    await submitCardWithGate(flow(), () => ({ submit: vi.fn(), isValid: false }), lock, log);

    expect(logger.events).toEqual([
      { type: "payment.submitBlocked", fields: { paymentMethod: "storedcard", reason: "noElement" } },
      { type: "payment.submitBlocked", fields: { paymentMethod: "storedcard", reason: "locked" } },
      { type: "payment.beforeSubmit", fields: { paymentMethod: "storedcard", allowed: true, threw: false } },
      { type: "payment.submitBlocked", fields: { paymentMethod: "storedcard", reason: "invalid" } },
    ]);
  });

  it("logs a host gate that refused or threw", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = recordingLogger();
    const log = { logger, paymentMethod: "card" };
    const card = () => ({ submit: vi.fn() });

    await submitCardWithGate(
      flow(async () => false),
      card,
      lock,
      log
    );
    await submitCardWithGate(
      flow(() => {
        throw new Error("host");
      }),
      card,
      lock,
      log
    );

    expect(logger.events.map((x) => x.fields)).toEqual([
      { paymentMethod: "card", allowed: false, threw: false },
      { paymentMethod: "card", allowed: false, threw: true },
    ]);
  });

  it("logs a wallet click and the gate decision", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = recordingLogger();
    const log = { logger, paymentMethod: "googlepay" };
    const resolve = vi.fn();
    const reject = vi.fn();

    createBeforeSubmitClickHandler(flow(), () => false, log)(resolve, reject);
    createBeforeSubmitClickHandler(flow(), () => true, log)(resolve, reject);
    createBeforeSubmitClickHandler(
      flow(() => false),
      () => false,
      log
    )(resolve, reject);
    createBeforeSubmitClickHandler(
      flow(() => {
        throw new Error("host");
      }),
      () => false,
      log
    )(resolve, reject);
    createBeforeSubmitClickHandler(
      flow(async () => true),
      () => false,
      log
    )(resolve, reject);
    createBeforeSubmitClickHandler(
      flow(() => Promise.reject(new Error("host"))),
      () => false,
      log
    )(resolve, reject);
    await vi.waitFor(() => expect(logger.events).toHaveLength(12));

    expect(logger.events).toEqual([
      { type: "wallet.clicked", fields: { paymentMethod: "googlepay" } },
      { type: "payment.beforeSubmit", fields: { paymentMethod: "googlepay", allowed: true, threw: false } },
      { type: "wallet.clicked", fields: { paymentMethod: "googlepay" } },
      { type: "payment.submitBlocked", fields: { paymentMethod: "googlepay", reason: "locked" } },
      { type: "wallet.clicked", fields: { paymentMethod: "googlepay" } },
      { type: "payment.beforeSubmit", fields: { paymentMethod: "googlepay", allowed: false, threw: false } },
      { type: "wallet.clicked", fields: { paymentMethod: "googlepay" } },
      { type: "payment.beforeSubmit", fields: { paymentMethod: "googlepay", allowed: false, threw: true } },
      { type: "wallet.clicked", fields: { paymentMethod: "googlepay" } },
      { type: "wallet.clicked", fields: { paymentMethod: "googlepay" } },
      { type: "payment.beforeSubmit", fields: { paymentMethod: "googlepay", allowed: true, threw: false } },
      { type: "payment.beforeSubmit", fields: { paymentMethod: "googlepay", allowed: false, threw: true } },
    ]);
  });

  it("logs a wallet cancel and an Adyen error by name only", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = recordingLogger();
    const handler = createAdyenErrorHandler(vi.fn(), "applepay", logger);

    handler({ name: "CANCEL", message: "closed" } as never);
    handler({ name: "NETWORK_ERROR", message: "https://secret.example/path failed" } as never);

    expect(logger.events).toEqual([
      { type: "wallet.cancelled", fields: { paymentMethod: "applepay" } },
      { type: "error.adyen", fields: { paymentMethod: "applepay", name: "NETWORK_ERROR", stage: "adyen" } },
    ]);
  });
});

describe("transport failure never changes the payment", () => {
  const send = vi.mocked(sendLogBatch);

  beforeEach(() => {
    vi.useFakeTimers();
    send.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    send.mockReset();
    send.mockResolvedValue(true);
  });

  it.each([
    ["rejects", () => send.mockRejectedValue(new Error("offline"))],
    ["returns false (HTTP 500)", () => send.mockResolvedValue(false)],
    [
      "throws",
      () =>
        send.mockImplementation(() => {
          throw new Error("sync");
        }),
    ],
  ])("when the transport %s", async (_label, breakTransport) => {
    breakTransport();
    const logger = createComponentLogger({
      enabled: true,
      url: "https://x/component-logs",
      identifier: { sessionId: "s1" },
      componentVersion: "test",
    });
    const { handlers, configuration, options } = setup({}, logger);

    for (let i = 0; i < 25; i++) {
      logger.log("ui.payClicked", { paymentMethod: "card" });
    }
    const resolveActions = actions();
    await handlers.handleOnSubmit(submitState, element, resolveActions);
    handlers.handlePaymentCompleted({ resultCode: "Authorised" } as never);
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS + RETRY_DELAYS_MS.reduce((a, b) => a + b, 0));

    expect(resolveActions.resolve).toHaveBeenCalledWith({ resultCode: "Authorised", action: undefined });
    expect(options.handleSuccess).toHaveBeenCalledWith({ key: "success.paymentAuthorized" });
    expect(configuration.onPaymentCompleted).toHaveBeenCalledWith({ resultCode: "Authorised" });
    expect(configuration.onPaymentFailed).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalled();
    logger.stop();
  });
});
