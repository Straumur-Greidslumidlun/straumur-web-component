import { describe, it, expect, vi, beforeEach } from "vitest";

const adapter = vi.hoisted(() => ({
  getPaymentMethods: vi.fn(),
  createPaymentRequest: vi.fn(),
  createDetailsRequest: vi.fn(),
  postDisableTokenRequest: vi.fn(),
}));

vi.mock("../src/adapter/straumur-adapter", () => adapter);

import {
  PaymentFlowError,
  toResultMessage,
  createSessionPaymentFlow,
  createAdvancedPaymentFlow,
} from "../src/flows/payment-flow";
import { AdvancedPaymentActions, DisableTokenActions } from "../src/models/models";
import { advancedConfig } from "./helpers/fixtures";

const okJson = (body: unknown) => ({ ok: true, json: async () => body });
const submitData = { paymentMethod: { type: "scheme" }, clientStateDataIndicator: true };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PaymentFlowError", () => {
  it("uses the message text when given, falling back to the key", () => {
    const withText = new PaymentFlowError("error.paymentFailed", "Card declined");
    expect(withText.message).toBe("Card declined");
    expect(withText.messageKey).toBe("error.paymentFailed");
    expect(withText.messageText).toBe("Card declined");

    const withoutText = new PaymentFlowError("error.paymentFailed");
    expect(withoutText.message).toBe("error.paymentFailed");
    expect(withoutText.messageText).toBeUndefined();
  });
});

describe("toResultMessage", () => {
  it("prefers the host-supplied text of a PaymentFlowError", () => {
    expect(toResultMessage(new PaymentFlowError("error.paymentFailed", "Declined"), "error.unknownError")).toEqual({
      text: "Declined",
    });
  });

  it("uses the PaymentFlowError's own key when it has no text", () => {
    expect(toResultMessage(new PaymentFlowError("error.paymentFailed"), "error.unknownError")).toEqual({
      key: "error.paymentFailed",
    });
  });

  it("maps any other error to the fallback key", () => {
    expect(toResultMessage(new Error("boom"), "error.unknownError")).toEqual({ key: "error.unknownError" });
    expect(toResultMessage(undefined, "error.unknownError")).toEqual({ key: "error.unknownError" });
  });
});

describe("createSessionPaymentFlow", () => {
  const flow = createSessionPaymentFlow("test", "session-1");

  describe("submitPayment", () => {
    it("posts the payment data with the session id and returns resultCode + action", async () => {
      adapter.createPaymentRequest.mockResolvedValue(okJson({ resultCode: "Authorised", action: { type: "x" } }));

      const result = await flow.submitPayment(submitData);

      expect(adapter.createPaymentRequest).toHaveBeenCalledWith("test", { ...submitData, sessionId: "session-1" });
      expect(result).toEqual({ resultCode: "Authorised", action: { type: "x" } });
    });

    it("throws a PaymentFlowError when the server responds non-OK", async () => {
      adapter.createPaymentRequest.mockResolvedValue({ ok: false });

      await expect(flow.submitPayment(submitData)).rejects.toMatchObject({
        messageKey: "error.failedToSubmitPayment",
      });
    });

    it("throws a PaymentFlowError when the resultCode is missing", async () => {
      adapter.createPaymentRequest.mockResolvedValue(okJson({}));

      await expect(flow.submitPayment(submitData)).rejects.toMatchObject({ messageKey: "error.paymentFailed" });
    });
  });

  describe("submitAdditionalDetails", () => {
    it("posts the details with the session id and returns resultCode + action", async () => {
      adapter.createDetailsRequest.mockResolvedValue(okJson({ resultCode: "Authorised" }));

      const result = await flow.submitAdditionalDetails({ details: { redirectResult: "r" } });

      expect(adapter.createDetailsRequest).toHaveBeenCalledWith("test", {
        details: { redirectResult: "r" },
        sessionId: "session-1",
      });
      expect(result).toEqual({ resultCode: "Authorised", action: undefined });
    });

    it("throws a PaymentFlowError when the server responds non-OK", async () => {
      adapter.createDetailsRequest.mockResolvedValue({ ok: false });

      await expect(flow.submitAdditionalDetails({ details: {} })).rejects.toMatchObject({
        messageKey: "error.failedToSubmitPaymentDetails",
      });
    });

    it("throws a PaymentFlowError when the resultCode is missing", async () => {
      adapter.createDetailsRequest.mockResolvedValue(okJson({}));

      await expect(flow.submitAdditionalDetails({ details: {} })).rejects.toMatchObject({
        messageKey: "error.paymentDetailsFailed",
      });
    });
  });

  describe("disableToken", () => {
    it("posts the stored payment method id with the session id", async () => {
      adapter.postDisableTokenRequest.mockResolvedValue(okJson({ success: true }));

      await flow.disableToken!("stored-1");

      expect(adapter.postDisableTokenRequest).toHaveBeenCalledWith("test", {
        storedPaymentMethodId: "stored-1",
        sessionId: "session-1",
      });
    });

    it("throws a PaymentFlowError when the server responds non-OK", async () => {
      adapter.postDisableTokenRequest.mockResolvedValue({ ok: false });

      await expect(flow.disableToken!("stored-1")).rejects.toMatchObject({
        messageKey: "error.failedToSubmitRemoveStoredPaymentCard",
      });
    });

    it("throws a PaymentFlowError when the server reports success: false", async () => {
      adapter.postDisableTokenRequest.mockResolvedValue(okJson({ success: false }));

      await expect(flow.disableToken!("stored-1")).rejects.toMatchObject({
        messageKey: "error.failedToRemoveStoredPaymentCard",
      });
    });
  });
});

describe("createAdvancedPaymentFlow", () => {
  describe("submitPayment", () => {
    it("passes the data to the host's onSubmit and resolves with the host's result", async () => {
      const onSubmit = vi.fn((state: { data: unknown }, actions: AdvancedPaymentActions) => {
        actions.resolve({ resultCode: "Authorised", action: { type: "x" }, errorMessage: "why" });
      });
      const flow = createAdvancedPaymentFlow(advancedConfig({ onSubmit }));

      const result = await flow.submitPayment(submitData);

      expect(onSubmit).toHaveBeenCalledWith({ data: submitData }, expect.anything());
      expect(result).toEqual({ resultCode: "Authorised", action: { type: "x" }, errorMessage: "why" });
    });

    it("rejects with a PaymentFlowError carrying the host's error message on actions.reject", async () => {
      const onSubmit = vi.fn((_state: unknown, actions: AdvancedPaymentActions) => {
        actions.reject("Host says no");
      });
      const flow = createAdvancedPaymentFlow(advancedConfig({ onSubmit }));

      await expect(flow.submitPayment(submitData)).rejects.toMatchObject({
        messageKey: "error.failedToSubmitPayment",
        messageText: "Host says no",
      });
    });

    it("wraps an error thrown by the host in a PaymentFlowError", async () => {
      const flow = createAdvancedPaymentFlow(
        advancedConfig({
          onSubmit: () => {
            throw new Error("host bug");
          },
        })
      );

      await expect(flow.submitPayment(submitData)).rejects.toMatchObject({
        messageKey: "error.failedToSubmitPayment",
        messageText: undefined,
      });
    });

    it("lets a PaymentFlowError thrown by the host pass through unchanged", async () => {
      const hostError = new PaymentFlowError("error.paymentFailed", "specific");
      const flow = createAdvancedPaymentFlow(
        advancedConfig({
          onSubmit: async () => {
            throw hostError;
          },
        })
      );

      await expect(flow.submitPayment(submitData)).rejects.toBe(hostError);
    });
  });

  describe("submitAdditionalDetails", () => {
    it("passes the details to the host's onAdditionalDetails and resolves with the host's result", async () => {
      const onAdditionalDetails = vi.fn((state: { data: unknown }, actions: AdvancedPaymentActions) => {
        actions.resolve({ resultCode: "Authorised" });
      });
      const flow = createAdvancedPaymentFlow(advancedConfig({ onAdditionalDetails }));

      const result = await flow.submitAdditionalDetails({ details: { redirectResult: "r" } });

      expect(onAdditionalDetails).toHaveBeenCalledWith(
        { data: { details: { redirectResult: "r" } } },
        expect.anything()
      );
      expect(result).toEqual({ resultCode: "Authorised" });
    });

    it("rejects with a PaymentFlowError carrying the host's error message on actions.reject", async () => {
      const flow = createAdvancedPaymentFlow(
        advancedConfig({
          onAdditionalDetails: (_state, actions) => {
            actions.reject("Details refused");
          },
        })
      );

      await expect(flow.submitAdditionalDetails({ details: {} })).rejects.toMatchObject({
        messageKey: "error.failedToSubmitPaymentDetails",
        messageText: "Details refused",
      });
    });

    it("wraps an error thrown by the host in a PaymentFlowError", async () => {
      const flow = createAdvancedPaymentFlow(
        advancedConfig({
          onAdditionalDetails: async () => {
            throw new Error("host bug");
          },
        })
      );

      await expect(flow.submitAdditionalDetails({ details: {} })).rejects.toMatchObject({
        messageKey: "error.failedToSubmitPaymentDetails",
      });
    });
  });

  describe("beforeSubmit", () => {
    it("is the host's onBeforeSubmit, untouched", () => {
      const onBeforeSubmit = vi.fn(() => true);
      const flow = createAdvancedPaymentFlow(advancedConfig({ onBeforeSubmit }));

      expect(flow.beforeSubmit).toBe(onBeforeSubmit);
    });

    it("is undefined when the host provides no onBeforeSubmit", () => {
      const flow = createAdvancedPaymentFlow(advancedConfig());

      expect(flow.beforeSubmit).toBeUndefined();
    });
  });

  describe("disableToken", () => {
    it("is absent when the host provides no onDisableToken", () => {
      const flow = createAdvancedPaymentFlow(advancedConfig());

      expect(flow.disableToken).toBeUndefined();
    });

    it("resolves when the host resolves", async () => {
      const onDisableToken = vi.fn((data: { storedPaymentMethodId: string }, actions: DisableTokenActions) => {
        actions.resolve();
      });
      const flow = createAdvancedPaymentFlow(advancedConfig({ onDisableToken }));

      await expect(flow.disableToken!("stored-1")).resolves.toBeUndefined();
      expect(onDisableToken).toHaveBeenCalledWith({ storedPaymentMethodId: "stored-1" }, expect.anything());
    });

    it("rejects with a PaymentFlowError when the host rejects", async () => {
      const flow = createAdvancedPaymentFlow(
        advancedConfig({
          onDisableToken: (_data, actions) => {
            actions.reject();
          },
        })
      );

      await expect(flow.disableToken!("stored-1")).rejects.toMatchObject({
        messageKey: "error.failedToRemoveStoredPaymentCard",
      });
    });

    it("wraps an error thrown by the host in a PaymentFlowError", async () => {
      const flow = createAdvancedPaymentFlow(
        advancedConfig({
          onDisableToken: async () => {
            throw new Error("host bug");
          },
        })
      );

      await expect(flow.disableToken!("stored-1")).rejects.toMatchObject({
        messageKey: "error.failedToSubmitRemoveStoredPaymentCard",
      });
    });
  });
});
