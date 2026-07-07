import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPaymentMethods,
  createPaymentRequest,
  createDetailsRequest,
  postDisableTokenRequest,
} from "../src/adapter/straumur-adapter";

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
