import { describe, it, expect, vi } from "vitest";
import { createBeforeSubmitClickHandler } from "../src/components/shared/before-submit-click";
import { PaymentFlow } from "../src/models/models";

function makeFlow(beforeSubmit?: PaymentFlow["beforeSubmit"]): PaymentFlow {
  return {
    submitPayment: vi.fn(),
    submitAdditionalDetails: vi.fn(),
    beforeSubmit,
  };
}

describe("createBeforeSubmitClickHandler", () => {
  it("resolves synchronously when no beforeSubmit gate is configured", () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    createBeforeSubmitClickHandler(makeFlow())(resolve, reject);

    // Synchronous resolution matters: Apple Pay's sheet must open within the user gesture.
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(reject).not.toHaveBeenCalled();
  });

  it("resolves synchronously when a synchronous gate returns true", () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    createBeforeSubmitClickHandler(makeFlow(() => true))(resolve, reject);

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(reject).not.toHaveBeenCalled();
  });

  it("rejects synchronously when a synchronous gate returns false", () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    createBeforeSubmitClickHandler(makeFlow(() => false))(resolve, reject);

    expect(reject).toHaveBeenCalledTimes(1);
    expect(resolve).not.toHaveBeenCalled();
  });

  it("resolves once an asynchronous gate resolves to true", async () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    createBeforeSubmitClickHandler(makeFlow(() => Promise.resolve(true)))(resolve, reject);

    expect(resolve).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(resolve).toHaveBeenCalledTimes(1));
    expect(reject).not.toHaveBeenCalled();
  });

  it("rejects once an asynchronous gate resolves to false", async () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    createBeforeSubmitClickHandler(makeFlow(() => Promise.resolve(false)))(resolve, reject);

    await vi.waitFor(() => expect(reject).toHaveBeenCalledTimes(1));
    expect(resolve).not.toHaveBeenCalled();
  });

  it("rejects when an asynchronous gate throws", async () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    createBeforeSubmitClickHandler(makeFlow(() => Promise.reject(new Error("gate error"))))(resolve, reject);

    await vi.waitFor(() => expect(reject).toHaveBeenCalledTimes(1));
    expect(resolve).not.toHaveBeenCalled();
  });
});
