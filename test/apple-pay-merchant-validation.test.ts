import { describe, it, expect, vi, afterEach } from "vitest";
import { createApplePayMerchantValidation } from "../src/components/shared/apple-pay-merchant-validation";

const VALIDATION_URL = "https://apple-pay-gateway.apple.com/paymentservices/startSession";

function run(validate: (url: string) => Promise<any>) {
  return new Promise<{ resolved?: unknown; rejected?: unknown }>((done) => {
    createApplePayMerchantValidation(validate)(
      (session) => done({ resolved: session }),
      (error) => done({ rejected: error }),
      VALIDATION_URL
    );
  });
}

describe("createApplePayMerchantValidation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("passes Apple's validationURL to the merchant and resolves Adyen with the session, untouched", async () => {
    const session = { epochTimestamp: 1, merchantSessionIdentifier: "abc", signature: "sig" };
    const validate = vi.fn().mockResolvedValue(session);

    const outcome = await run(validate);

    expect(validate).toHaveBeenCalledWith(VALIDATION_URL);
    expect(outcome.resolved).toBe(session);
  });

  it.each([
    ["the merchant's promise rejects", () => Promise.reject(new Error("server down"))],
    [
      "the merchant throws synchronously",
      () => {
        throw new Error("bug");
      },
    ],
    ["the merchant resolves without a session", () => Promise.resolve(undefined)],
  ])("rejects (aborting the Apple Pay sheet) when %s", async (_label, validate) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const outcome = await run(validate as any);

    expect(outcome.rejected).toBeInstanceOf(Error);
    expect(consoleError).toHaveBeenCalledWith(
      "[StraumurCheckout] onApplePayValidateMerchant failed:",
      expect.any(Error)
    );
  });
});
