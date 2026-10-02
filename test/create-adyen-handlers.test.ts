import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdyenErrorHandler,
  createAdyenPaymentHandlers,
  AdyenPaymentHandlersOptions,
} from "../src/components/shared/create-adyen-handlers";
import { PaymentFlowError } from "../src/flows/payment-flow";
import { PaymentFlow } from "../src/models/models";
import { baseConfig } from "./helpers/fixtures";

const element = {} as any;
const actions = () => ({ resolve: vi.fn(), reject: vi.fn() });
const submitState = { data: { paymentMethod: { type: "scheme" } } } as any;
const detailsState = { data: { details: { redirectResult: "r" } } } as any;

function makeFlow(overrides: Partial<PaymentFlow> = {}): PaymentFlow {
  return {
    submitPayment: vi.fn().mockResolvedValue({ resultCode: "Authorised" }),
    submitAdditionalDetails: vi.fn().mockResolvedValue({ resultCode: "Authorised" }),
    ...overrides,
  };
}

function setup(flowOverrides: Partial<PaymentFlow> = {}, optionOverrides: Partial<AdyenPaymentHandlersOptions> = {}) {
  const paymentFlow = makeFlow(flowOverrides);
  const options: AdyenPaymentHandlersOptions = {
    configuration: baseConfig({ paymentFlow, onPaymentCompleted: vi.fn(), onPaymentFailed: vi.fn() }),
    handleSuccess: vi.fn(),
    handleError: vi.fn(),
    setThreeDSecureActive: vi.fn(),
    ...optionOverrides,
  };
  return { handlers: createAdyenPaymentHandlers(options), options, paymentFlow };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleOnSubmit", () => {
  it("notifies onSubmitStart before submitting", async () => {
    const order: string[] = [];
    const { handlers } = setup(
      { submitPayment: vi.fn().mockImplementation(async () => (order.push("submit"), { resultCode: "Authorised" })) },
      { onSubmitStart: () => order.push("start") }
    );

    await handlers.handleOnSubmit(submitState, element, actions());

    expect(order).toEqual(["start", "submit"]);
  });

  it("does not run the beforeSubmit gate itself (every entry point already ran it once)", async () => {
    const beforeSubmit = vi.fn().mockResolvedValue(false);
    const { handlers, paymentFlow } = setup({ beforeSubmit });
    const a = actions();

    await handlers.handleOnSubmit(submitState, element, a);

    expect(beforeSubmit).not.toHaveBeenCalled();
    expect(paymentFlow.submitPayment).toHaveBeenCalledTimes(1);
    expect(a.resolve).toHaveBeenCalledWith({ resultCode: "Authorised", action: undefined });
  });

  it("applies enrichSubmitData before handing the data to the payment flow", async () => {
    const { handlers, paymentFlow } = setup(
      {},
      {
        enrichSubmitData: (data) => ({
          ...data,
          paymentMethod: { ...data.paymentMethod, storedPaymentMethodId: "s1" },
        }),
      }
    );

    await handlers.handleOnSubmit(submitState, element, actions());

    expect(paymentFlow.submitPayment).toHaveBeenCalledWith({
      paymentMethod: { type: "scheme", storedPaymentMethodId: "s1" },
    });
  });

  it("passes the state data through unchanged without enrichSubmitData", async () => {
    const { handlers, paymentFlow } = setup();

    await handlers.handleOnSubmit(submitState, element, actions());

    expect(paymentFlow.submitPayment).toHaveBeenCalledWith(submitState.data);
  });

  it.each(["ChallengeShopper", "IdentifyShopper"] as const)("activates 3DS mode on %s", async (resultCode) => {
    const { handlers, options } = setup({ submitPayment: vi.fn().mockResolvedValue({ resultCode }) });

    await handlers.handleOnSubmit(submitState, element, actions());

    expect(options.setThreeDSecureActive).toHaveBeenCalledWith(true);
  });

  it("does not activate 3DS mode for a final resultCode", async () => {
    const { handlers, options } = setup();

    await handlers.handleOnSubmit(submitState, element, actions());

    expect(options.setThreeDSecureActive).not.toHaveBeenCalled();
  });

  it("rejects, and the host's error text survives Adyen's follow-up onPaymentFailed", async () => {
    const { handlers, options } = setup({
      submitPayment: vi.fn().mockRejectedValue(new PaymentFlowError("error.failedToSubmitPayment", "Host message")),
    });
    const a = actions();

    await handlers.handleOnSubmit(submitState, element, a);
    expect(a.reject).toHaveBeenCalledTimes(1);
    // Adyen answers the reject with onPaymentFailed (no payload).
    handlers.handlePaymentFailed(undefined);

    expect(options.handleError).toHaveBeenCalledTimes(1);
    expect(options.handleError).toHaveBeenCalledWith({ text: "Host message" });
    expect(options.configuration.onPaymentFailed).toHaveBeenCalledTimes(1);
    expect(options.configuration.onPaymentFailed).toHaveBeenCalledWith({ resultCode: "Error" });
  });

  it("rejects and shows the generic key when the flow fails with an unknown error", async () => {
    const { handlers, options } = setup({ submitPayment: vi.fn().mockRejectedValue(new Error("boom")) });
    const a = actions();

    await handlers.handleOnSubmit(submitState, element, a);
    handlers.handlePaymentFailed(undefined);

    expect(a.reject).toHaveBeenCalledTimes(1);
    expect(options.handleError).toHaveBeenCalledWith({ key: "error.failedToSubmitPayment" });
  });
});

describe("handleOnSubmitAdditionalData", () => {
  it("resolves with the flow's resultCode and action", async () => {
    const { handlers, paymentFlow } = setup({
      submitAdditionalDetails: vi.fn().mockResolvedValue({ resultCode: "Authorised", action: { type: "x" } }),
    });
    const a = actions();

    await handlers.handleOnSubmitAdditionalData(detailsState, element, a);

    expect(paymentFlow.submitAdditionalDetails).toHaveBeenCalledWith(detailsState.data);
    expect(a.resolve).toHaveBeenCalledWith({ resultCode: "Authorised", action: { type: "x" } });
  });

  it("rejects and reports the error when the flow fails", async () => {
    const { handlers, options } = setup({
      submitAdditionalDetails: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const a = actions();

    await handlers.handleOnSubmitAdditionalData(detailsState, element, a);
    handlers.handlePaymentFailed(undefined);

    expect(a.reject).toHaveBeenCalledTimes(1);
    expect(options.handleError).toHaveBeenCalledWith({ key: "error.failedToSubmitPaymentDetails" });
  });

  it.each([true, false])(
    "fires onPaymentFailed exactly once on a thrown details call (dispatchResultFromAdditionalDetails=%s)",
    async (dispatchResultFromAdditionalDetails) => {
      const { handlers, options } = setup(
        { submitAdditionalDetails: vi.fn().mockRejectedValue(new Error("boom")) },
        { dispatchResultFromAdditionalDetails }
      );

      await handlers.handleOnSubmitAdditionalData(detailsState, element, actions());
      // Mounted components get Adyen's follow-up onPaymentFailed; the redirect bootstrap does not.
      if (!dispatchResultFromAdditionalDetails) handlers.handlePaymentFailed(undefined);

      expect(options.configuration.onPaymentFailed).toHaveBeenCalledTimes(1);
      expect(options.handleError).toHaveBeenLastCalledWith({ key: "error.failedToSubmitPaymentDetails" });
    }
  );
});

describe("result dispatch", () => {
  it("shows the success screen and notifies the merchant when the payment is Authorised", () => {
    const { handlers, options } = setup();

    handlers.handlePaymentCompleted({ resultCode: "Authorised" } as any);

    expect(options.handleSuccess).toHaveBeenCalledWith({ key: "success.paymentAuthorized" });
    expect(options.configuration.onPaymentCompleted).toHaveBeenCalledWith({ resultCode: "Authorised" });
  });

  it("shows the generic failure message and routes a refused payment to onPaymentFailed", () => {
    const { handlers, options } = setup();

    handlers.handlePaymentCompleted({ resultCode: "Refused" } as any);

    expect(options.handleError).toHaveBeenCalledWith({ key: "error.paymentUnsuccessful" });
    expect(options.configuration.onPaymentFailed).toHaveBeenCalledWith({ resultCode: "Refused" });
    expect(options.configuration.onPaymentCompleted).not.toHaveBeenCalled();
  });

  // Adyen Web 6 semantics: Refused/Cancelled/Error are failures, everything else completes.
  it.each([
    ["Authorised", "onPaymentCompleted"],
    ["Received", "onPaymentCompleted"],
    ["Pending", "onPaymentCompleted"],
    ["PartiallyAuthorised", "onPaymentCompleted"],
    ["PresentToShopper", "onPaymentCompleted"],
    ["Refused", "onPaymentFailed"],
    ["Cancelled", "onPaymentFailed"],
    ["Error", "onPaymentFailed"],
  ] as const)("routes %s to %s", (resultCode, callback) => {
    const { handlers, options } = setup();

    handlers.handlePaymentCompleted({ resultCode } as any);

    const expected =
      callback === "onPaymentFailed" ? options.configuration.onPaymentFailed : options.configuration.onPaymentCompleted;
    const other =
      callback === "onPaymentFailed" ? options.configuration.onPaymentCompleted : options.configuration.onPaymentFailed;
    expect(expected).toHaveBeenCalledWith({ resultCode });
    expect(other).not.toHaveBeenCalled();
  });

  it("shows the host-supplied errorMessage captured during submission when the payment fails", async () => {
    const { handlers, options } = setup({
      submitPayment: vi.fn().mockResolvedValue({ resultCode: "Refused", errorMessage: "Custom decline reason" }),
    });

    await handlers.handleOnSubmit(submitState, element, actions());
    handlers.handlePaymentCompleted({ resultCode: "Refused" } as any);

    expect(options.handleError).toHaveBeenCalledWith({ text: "Custom decline reason" });
  });

  it("shows the errorMessage captured from additional details when the payment fails", async () => {
    const { handlers, options } = setup({
      submitAdditionalDetails: vi.fn().mockResolvedValue({ resultCode: "Refused", errorMessage: "3DS declined" }),
    });

    await handlers.handleOnSubmitAdditionalData(detailsState, element, actions());
    handlers.handlePaymentFailed({ resultCode: "Refused" } as any);

    expect(options.handleError).toHaveBeenCalledWith({ text: "3DS declined" });
  });

  it("handlePaymentFailed with data notifies the merchant with the resultCode", () => {
    const { handlers, options } = setup();

    handlers.handlePaymentFailed({ resultCode: "Refused" } as any);

    expect(options.handleError).toHaveBeenCalledWith({ key: "error.paymentUnsuccessful" });
    expect(options.configuration.onPaymentFailed).toHaveBeenCalledWith({ resultCode: "Refused" });
  });

  it("handlePaymentFailed without data synthesizes an Error resultCode", () => {
    const { handlers, options } = setup();

    handlers.handlePaymentFailed();

    expect(options.configuration.onPaymentFailed).toHaveBeenCalledWith({ resultCode: "Error" });
    expect(options.handleError).toHaveBeenCalledWith({ key: "error.paymentUnsuccessful" });
  });
});

describe("processing overlay state (setPaymentProcessing)", () => {
  it("turns on after the gate passes and stays on for a 3DS action", async () => {
    const setPaymentProcessing = vi.fn();
    const { handlers } = setup(
      { submitPayment: vi.fn().mockResolvedValue({ resultCode: "IdentifyShopper", action: { type: "threeDS2" } }) },
      { setPaymentProcessing }
    );

    await handlers.handleOnSubmit(submitState, element, actions());

    expect(setPaymentProcessing.mock.calls).toEqual([[true]]);
  });

  it("turns off when /payments throws", async () => {
    const setPaymentProcessing = vi.fn();
    const { handlers } = setup(
      { submitPayment: vi.fn().mockRejectedValue(new Error("boom")) },
      { setPaymentProcessing }
    );

    await handlers.handleOnSubmit(submitState, element, actions());

    expect(setPaymentProcessing.mock.calls).toEqual([[true], [false]]);
  });

  it("lifts only once the challenge iframe is on screen, not for the hidden fingerprint iframe", () => {
    const setPaymentProcessing = vi.fn();
    const { handlers } = setup({}, { setPaymentProcessing });

    handlers.handleActionHandled({
      componentType: "3DS2Fingerprint",
      actionDescription: "3DS2 fingerprint iframe loaded",
    });
    expect(setPaymentProcessing).not.toHaveBeenCalled();

    handlers.handleActionHandled({ componentType: "3DS2Challenge", actionDescription: "3DS2 challenge iframe loaded" });
    expect(setPaymentProcessing).toHaveBeenCalledWith(false);
  });

  it("turns back on while /payments/details runs, and off if it throws", async () => {
    const setPaymentProcessing = vi.fn();
    const { handlers } = setup(
      { submitAdditionalDetails: vi.fn().mockRejectedValue(new Error("boom")) },
      { setPaymentProcessing }
    );

    await handlers.handleOnSubmitAdditionalData(detailsState, element, actions());

    expect(setPaymentProcessing.mock.calls).toEqual([[true], [false]]);
  });
});

describe("result screens", () => {
  it.each(["Pending", "Received"] as const)(
    "shows the 'being processed' screen (not a failure) for %s",
    (resultCode) => {
      const { handlers, options } = setup();

      handlers.handlePaymentCompleted({ resultCode } as any);

      expect(options.handleSuccess).toHaveBeenCalledWith({ key: "success.paymentPending" });
      expect(options.handleError).not.toHaveBeenCalled();
      expect(options.configuration.onPaymentCompleted).toHaveBeenCalledWith({ resultCode });
    }
  );
});

describe("createAdyenErrorHandler", () => {
  it("ignores a shopper cancel", () => {
    const handleError = vi.fn();

    createAdyenErrorHandler(handleError, "card")({ name: "CANCEL" } as any);

    expect(handleError).not.toHaveBeenCalled();
  });

  it("logs any other Adyen error and shows the generic failure (without firing host callbacks)", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const handleError = vi.fn();
    const error = { name: "NETWORK_ERROR", message: "x" } as any;

    createAdyenErrorHandler(handleError, "card")(error);

    expect(handleError).toHaveBeenCalledWith({ key: "error.unknownError" });
    expect(consoleError).toHaveBeenCalledWith("[StraumurCheckout] Adyen error (card):", error);
    consoleError.mockRestore();
  });
});
