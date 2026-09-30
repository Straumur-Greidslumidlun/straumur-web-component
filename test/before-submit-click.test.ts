import { describe, it, expect, vi } from "vitest";
import { createBeforeSubmitClickHandler, submitCardWithGate } from "../src/components/shared/before-submit-click";
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

describe("createBeforeSubmitClickHandler lock and errors", () => {
  it("refuses to open the sheet while another payment holds the lock", () => {
    const resolve = vi.fn();
    const reject = vi.fn();
    const beforeSubmit = vi.fn(() => true);

    createBeforeSubmitClickHandler(makeFlow(beforeSubmit), () => true)(resolve, reject);

    expect(reject).toHaveBeenCalled();
    expect(beforeSubmit).not.toHaveBeenCalled();
  });

  it("rejects (instead of throwing into Adyen) when a synchronous gate throws", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const reject = vi.fn();

    createBeforeSubmitClickHandler(
      makeFlow(() => {
        throw new Error("host bug");
      })
    )(vi.fn(), reject);

    expect(reject).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("submitCardWithGate", () => {
  function makeLock() {
    let held = false;
    return {
      tryStart: vi.fn(() => (held ? false : (held = true))),
      release: vi.fn(() => {
        held = false;
      }),
      get held() {
        return held;
      },
    };
  }

  it("submits once per click even when clicked twice in the same tick", async () => {
    const element = { submit: vi.fn(), isValid: true };
    const lock = makeLock();
    const beforeSubmit = vi.fn(() => Promise.resolve(true));
    const flow = makeFlow(beforeSubmit);

    await Promise.all([submitCardWithGate(flow, () => element, lock), submitCardWithGate(flow, () => element, lock)]);

    expect(element.submit).toHaveBeenCalledTimes(1);
    expect(beforeSubmit).toHaveBeenCalledTimes(1);
    // Held until the payment's outcome takes over the widget.
    expect(lock.held).toBe(true);
  });

  it("releases the lock and does not submit when the gate declines", async () => {
    const element = { submit: vi.fn(), isValid: true };
    const lock = makeLock();

    await submitCardWithGate(
      makeFlow(() => false),
      () => element,
      lock
    );

    expect(element.submit).not.toHaveBeenCalled();
    expect(lock.held).toBe(false);
  });

  it("never rejects, and releases the lock, when the gate throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const element = { submit: vi.fn(), isValid: true };
    const lock = makeLock();

    await expect(
      submitCardWithGate(
        makeFlow(() => Promise.reject(new Error("host bug"))),
        () => element,
        lock
      )
    ).resolves.toBeUndefined();

    expect(element.submit).not.toHaveBeenCalled();
    expect(lock.held).toBe(false);
    consoleError.mockRestore();
  });

  it("releases the lock for an invalid form (submit only shows validation; onSubmit never fires)", async () => {
    const element = { submit: vi.fn(), isValid: false };
    const lock = makeLock();

    await submitCardWithGate(makeFlow(), () => element, lock);

    expect(element.submit).toHaveBeenCalledTimes(1);
    expect(lock.held).toBe(false);
  });

  it("skips the gate entirely when there is no element yet", async () => {
    const beforeSubmit = vi.fn(() => true);
    const lock = makeLock();

    await submitCardWithGate(makeFlow(beforeSubmit), () => undefined, lock);

    expect(beforeSubmit).not.toHaveBeenCalled();
    expect(lock.tryStart).not.toHaveBeenCalled();
  });

  it("does not submit (and releases) when the element is torn down during the gate", async () => {
    let element: { submit: () => void } | undefined = { submit: vi.fn() };
    const submit = element.submit;
    const lock = makeLock();

    await submitCardWithGate(
      makeFlow(async () => {
        element = undefined;
        return true;
      }),
      () => element,
      lock
    );

    expect(submit).not.toHaveBeenCalled();
    expect(lock.held).toBe(false);
  });
});
