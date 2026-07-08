import { describe, it, expect, vi, beforeEach } from "vitest";
import {
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

  it("rejects and skips submission when the beforeSubmit gate returns false", async () => {
    const { handlers, paymentFlow } = setup({ beforeSubmit: vi.fn().mockResolvedValue(false) });
    const a = actions();

    await handlers.handleOnSubmit(submitState, element, a);

    expect(a.reject).toHaveBeenCalledTimes(1);
    expect(paymentFlow.submitPayment).not.toHaveBeenCalled();
  });

  it("submits when the beforeSubmit gate returns true", async () => {
    const { handlers, paymentFlow } = setup({ beforeSubmit: vi.fn().mockResolvedValue(true) });
    const a = actions();

    await handlers.handleOnSubmit(submitState, element, a);

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

  it("rejects and shows the host's error text when the flow fails with a PaymentFlowError", async () => {
    const { handlers, options } = setup({
      submitPayment: vi.fn().mockRejectedValue(new PaymentFlowError("error.failedToSubmitPayment", "Host message")),
    });
    const a = actions();

    await handlers.handleOnSubmit(submitState, element, a);

    expect(a.reject).toHaveBeenCalledTimes(1);
    expect(options.handleError).toHaveBeenCalledWith({ text: "Host message" });
  });

  it("rejects and shows the generic key when the flow fails with an unknown error", async () => {
    const { handlers, options } = setup({ submitPayment: vi.fn().mockRejectedValue(new Error("boom")) });
    const a = actions();

    await handlers.handleOnSubmit(submitState, element, a);

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

    expect(a.reject).toHaveBeenCalledTimes(1);
    expect(options.handleError).toHaveBeenCalledWith({ key: "error.failedToSubmitPaymentDetails" });
  });
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
