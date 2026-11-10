import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getPaymentMethods,
  createPaymentRequest,
  createDetailsRequest,
  postDisableTokenRequest,
  REQUEST_TIMEOUT_MS,
  PAYMENT_TIMEOUT_MS,
} from "../src/adapter/straumur-adapter";
import { RequestTimeoutError } from "../src/adapter/request-timeout-error";

const STAGING = "https://checkout-api.staging.straumur.is/api/v1/embeddedcheckout";
const PRODUCTION = "https://greidslugatt.straumur.is/api/v1/embeddedcheckout";

describe("straumur-adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  function lastCall() {
    const mock = fetch as unknown as ReturnType<typeof vi.fn>;
    return mock.mock.calls[mock.mock.calls.length - 1];
  }

  it("posts payment-methods to the staging host in the test environment", () => {
    getPaymentMethods("test", { sessionId: "s1" });
    const [url, init] = lastCall();
    expect(url).toBe(`${STAGING}/payment-methods`);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ sessionId: "s1" });
  });

  it("posts payment-methods to the production host in the live environment", () => {
    getPaymentMethods("live", { sessionId: "s1" });
    const [url] = lastCall();
    expect(url).toBe(`${PRODUCTION}/payment-methods`);
  });

  it("posts to the payment endpoint", () => {
    createPaymentRequest("test", {
      sessionId: "s1",
      clientStateDataIndicator: true,
      paymentMethod: { type: "scheme" },
    });
    const [url, init] = lastCall();
    expect(url).toBe(`${STAGING}/payment`);
    expect(JSON.parse(init.body).paymentMethod).toEqual({ type: "scheme" });
  });

  it("posts to the details endpoint", () => {
    createDetailsRequest("test", { sessionId: "s1", details: { redirectResult: "rr" } });
    const [url, init] = lastCall();
    expect(url).toBe(`${STAGING}/details`);
    expect(JSON.parse(init.body).details.redirectResult).toBe("rr");
  });

  it("posts to the disable-token endpoint", () => {
    postDisableTokenRequest("live", { sessionId: "s1", storedPaymentMethodId: "tok" });
    const [url, init] = lastCall();
    expect(url).toBe(`${PRODUCTION}/disable-token`);
    expect(JSON.parse(init.body).storedPaymentMethodId).toBe("tok");
  });
});

describe("straumur-adapter timeouts", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** A fetch that never answers, but rejects like the browser does once its signal aborts. */
  function hangingFetch() {
    return vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        })
    );
  }

  it("rejects with RequestTimeoutError when payment-methods hangs past REQUEST_TIMEOUT_MS", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", hangingFetch());

    const pending = getPaymentMethods("test", { sessionId: "s1" });
    const assertion = expect(pending).rejects.toBeInstanceOf(RequestTimeoutError);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await assertion;
  });

  it("gives /payment the longer PAYMENT_TIMEOUT_MS before giving up", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", hangingFetch());
    let settled = false;

    const pending = createPaymentRequest("test", { sessionId: "s1" } as any).catch((error) => {
      settled = true;
      return error;
    });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(PAYMENT_TIMEOUT_MS - REQUEST_TIMEOUT_MS);
    expect(await pending).toBeInstanceOf(RequestTimeoutError);
  });

  it("passes non-timeout network errors through unchanged", async () => {
    const networkError = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(networkError));

    await expect(getPaymentMethods("test", { sessionId: "s1" })).rejects.toBe(networkError);
  });
});
