import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPaymentMethods } from "../src/adapter/straumur-adapter";
import { setupPaymentMethods } from "../src/services/straumur-service";

vi.mock("../src/adapter/straumur-adapter", () => ({
  getPaymentMethods: vi.fn(),
}));

const getPaymentMethodsMock = vi.mocked(getPaymentMethods);

/** Build a minimal Response-like object for the service to consume. */
function fakeResponse(opts: { ok: boolean; contentType?: string; json?: unknown }) {
  return {
    ok: opts.ok,
    headers: { get: (name: string) => (name === "content-type" ? opts.contentType ?? null : null) },
    json: async () => opts.json,
  } as unknown as Response;
}

describe("setupPaymentMethods", () => {
  beforeEach(() => {
    getPaymentMethodsMock.mockReset();
  });

  it("normalizes a successful response into a Success result", async () => {
    getPaymentMethodsMock.mockResolvedValue(
      fakeResponse({ ok: true, json: { clientKey: "ck", currency: "ISK" } })
    );

    const result = await setupPaymentMethods("test", "session-1");

    expect(result.resultCode).toBe("Success");
    expect(result).toMatchObject({ clientKey: "ck", currency: "ISK" });
    expect(getPaymentMethodsMock).toHaveBeenCalledWith("test", { sessionId: "session-1" });
  });

  it("extracts the server errorMessage from a JSON error response", async () => {
    getPaymentMethodsMock.mockResolvedValue(
      fakeResponse({ ok: false, contentType: "application/json", json: { errorMessage: "error.paymentFailed" } })
    );

    const result = await setupPaymentMethods("test", "session-1");

    expect(result).toEqual({ resultCode: "Error", error: "error.paymentFailed" });
  });

  it("uses the generic error key when a failed response is not JSON", async () => {
    getPaymentMethodsMock.mockResolvedValue(fakeResponse({ ok: false, contentType: "text/html" }));

    const result = await setupPaymentMethods("test", "session-1");

    expect(result).toEqual({ resultCode: "Error", error: "error.failedToInitializePaymentMethods" });
  });

  it("returns the generic error key when the request throws", async () => {
    getPaymentMethodsMock.mockRejectedValue(new Error("network down"));

    const result = await setupPaymentMethods("test", "session-1");

    expect(result).toEqual({ resultCode: "Error", error: "error.failedToInitializePaymentMethods" });
  });
});
