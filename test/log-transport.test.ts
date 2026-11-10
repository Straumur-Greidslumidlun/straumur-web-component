import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// test/setup.ts mocks the transport for every other test; this file tests the real one.
vi.unmock("../src/logging/log-transport");

const { sendLogBatch, LOG_REQUEST_TIMEOUT_MS } = await import("../src/logging/log-transport");

const URL = "https://checkout-api.staging.straumur.is/api/v1/embeddedcheckout/component-logs";
const BODY = '{"sessionId":"s1","logs":[]}';

describe("sendLogBatch", () => {
  const originalSendBeacon = navigator.sendBeacon;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    Object.defineProperty(navigator, "sendBeacon", { value: originalSendBeacon, configurable: true, writable: true });
  });

  function setSendBeacon(value: unknown) {
    Object.defineProperty(navigator, "sendBeacon", { value, configurable: true, writable: true });
  }

  it("posts the body as text/plain with keepalive and no credentials", async () => {
    const delivered = await sendLogBatch(URL, BODY, { unloading: false });

    expect(delivered).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: BODY,
        keepalive: true,
        credentials: "omit",
      })
    );
  });

  it("reports a non-2xx response as not delivered", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false }))
    );

    expect(await sendLogBatch(URL, BODY, { unloading: false })).toBe(false);
  });

  it("reports a rejected or throwing fetch as not delivered, without throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("Failed to fetch")))
    );
    expect(await sendLogBatch(URL, BODY, { unloading: false })).toBe(false);

    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("sync");
      })
    );
    expect(await sendLogBatch(URL, BODY, { unloading: false })).toBe(false);
  });

  it("aborts a request that takes longer than the timeout", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            signal = init.signal!;
            signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
          })
      )
    );

    const result = sendLogBatch(URL, BODY, { unloading: false });
    await vi.advanceTimersByTimeAsync(LOG_REQUEST_TIMEOUT_MS);

    expect(signal!.aborted).toBe(true);
    expect(await result).toBe(false);
  });

  it("uses sendBeacon with a text/plain Blob when unloading", async () => {
    const sendBeacon = vi.fn(() => true);
    setSendBeacon(sendBeacon);

    const delivered = await sendLogBatch(URL, BODY, { unloading: true });

    expect(delivered).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
    const blob = (sendBeacon.mock.calls[0] as unknown[])[1] as Blob;
    expect(sendBeacon.mock.calls[0]).toEqual([URL, expect.any(Blob)]);
    expect(blob.type).toBe("text/plain;charset=utf-8");
  });

  it.each([
    ["missing", undefined],
    ["refusing the beacon", vi.fn(() => false)],
    [
      "throwing",
      vi.fn(() => {
        throw new Error("beacon");
      }),
    ],
  ])("falls back to a keepalive fetch when sendBeacon is %s", async (_label, sendBeacon) => {
    setSendBeacon(sendBeacon);

    const delivered = await sendLogBatch(URL, BODY, { unloading: true });

    expect(delivered).toBe(true);
    expect(fetch).toHaveBeenCalledWith(URL, expect.objectContaining({ keepalive: true }));
  });
});
