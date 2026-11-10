import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendLogBatch } from "../src/logging/log-transport";
import {
  ComponentLogger,
  createComponentLogger,
  FLUSH_DELAY_MS,
  LogBatchBody,
  MAX_BATCH_SIZE,
  MAX_QUEUE_SIZE,
  NOOP_LOGGER,
  RETRY_DELAYS_MS,
} from "../src/logging/component-logger";

const URL = "https://example.test/component-logs";
const send = vi.mocked(sendLogBatch);

function createLogger(context?: Record<string, string>) {
  return new ComponentLogger(URL, { sessionId: "sess_1" }, "2.0.0-test", context);
}

function sentBodies(): LogBatchBody[] {
  return send.mock.calls.map((call) => JSON.parse(call[1]) as LogBatchBody);
}

function logMany(logger: ComponentLogger, count: number) {
  for (let i = 0; i < count; i++) {
    logger.log("ui.payClicked", { paymentMethod: "card" });
  }
}

describe("ComponentLogger", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T10:00:00.000Z"));
    send.mockReset();
    send.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("batching", () => {
    it("sends 45 entries as batches of 20, 20 and 5 with sequences 1..45 in order", async () => {
      const logger = createLogger();

      logMany(logger, 45);
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

      const bodies = sentBodies();
      expect(bodies.map((x) => x.logs.length)).toEqual([20, 20, 5]);
      const entries = bodies.flatMap((x) => x.logs);
      expect(entries.map((x) => x.sequence)).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
      expect(new Set(entries.map((x) => x.clientEventId)).size).toBe(45);
    });

    it("sends a partial batch 5 s after the first unsent entry", async () => {
      const logger = createLogger();

      logger.log("lifecycle.mount");
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS - 1);
      expect(send).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][0]).toBe(URL);
      expect(send.mock.calls[0][2]).toEqual({ unloading: false });
    });

    it("stamps each entry with the clock at log() time and lifts paymentMethod out of data", async () => {
      const logger = createLogger();

      logger.log("ui.payClicked", { paymentMethod: "card" });
      vi.setSystemTime(new Date("2026-11-10T10:00:01.500Z"));
      logger.log("payment.response", { paymentMethod: "scheme", resultCode: "Authorised", hasAction: false });
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

      const [first, second] = sentBodies()[0].logs;
      expect(first).toMatchObject({
        sequence: 1,
        timestamp: "2026-11-10T10:00:00.000Z",
        category: "ui",
        type: "ui.payClicked",
        paymentMethod: "card",
        data: {},
      });
      expect(second).toMatchObject({
        timestamp: "2026-11-10T10:00:01.500Z",
        paymentMethod: "scheme",
        data: { resultCode: "Authorised", hasAction: false },
      });
    });

    it("sends the identifier, component version and the context only on the first delivered batch", async () => {
      const logger = createLogger({ mode: "session" });

      logger.log("lifecycle.mount");
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);
      logger.log("lifecycle.destroy");
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

      const [first, second] = sentBodies();
      expect(first).toMatchObject({
        sessionId: "sess_1",
        componentVersion: "2.0.0-test",
        context: { mode: "session" },
      });
      expect(first).not.toHaveProperty("checkoutReference");
      expect(first).not.toHaveProperty("droppedCount");
      expect(second).not.toHaveProperty("context");
    });

    it("sends checkoutReference for a hosted checkout", async () => {
      const logger = new ComponentLogger(URL, { checkoutReference: "UC-1" }, "v");

      logger.log("lifecycle.mount");
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

      expect(sentBodies()[0]).toMatchObject({ checkoutReference: "UC-1" });
      expect(sentBodies()[0]).not.toHaveProperty("sessionId");
    });

    it("keeps only one request in flight", async () => {
      let resolveFirst: (value: boolean) => void = () => {};
      send.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)));
      const logger = createLogger();

      logMany(logger, MAX_BATCH_SIZE * 2);
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);
      expect(send).toHaveBeenCalledTimes(1);

      resolveFirst(true);
      await vi.advanceTimersByTimeAsync(0);
      expect(send).toHaveBeenCalledTimes(2);
    });

    it("drops unknown event types", async () => {
      const logger = createLogger();

      logger.log("payment.cardNumberTyped" as never, { value: "4111" });
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

      expect(send).not.toHaveBeenCalled();
      expect(logger.queuedCount).toBe(0);
    });
  });

  describe("bounded queue", () => {
    it("keeps at most 500 entries and reports the dropped ones in the next batch", async () => {
      send.mockResolvedValue(false);
      const logger = createLogger();

      // Fill the queue while the first batch keeps failing; it is only retried after its backoff.
      logMany(logger, 520);
      expect(logger.queuedCount).toBeLessThanOrEqual(MAX_QUEUE_SIZE);
      await vi.advanceTimersByTimeAsync(0);
      expect(logger.queuedCount).toBe(MAX_QUEUE_SIZE);

      send.mockResolvedValue(true);
      await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0]);

      // The first delivered batch reports the drop; the queue then drains in batches of 20.
      const [failed, firstDelivered, ...rest] = sentBodies();
      expect(failed).not.toHaveProperty("droppedCount");
      expect(firstDelivered.droppedCount).toBe(20);
      expect(rest.every((x) => x.droppedCount === undefined)).toBe(true);
    });
  });

  describe("retry", () => {
    it("retries a failed batch after 2 s, 4 s and 8 s, then drops it and reports it as dropped", async () => {
      send.mockResolvedValue(false);
      const logger = createLogger();

      logger.log("lifecycle.mount");
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);
      expect(send).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0] - 1);
      expect(send).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(send).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[1]);
      expect(send).toHaveBeenCalledTimes(3);
      await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[2]);
      expect(send).toHaveBeenCalledTimes(4);

      await vi.advanceTimersByTimeAsync(60_000);
      expect(send).toHaveBeenCalledTimes(4);
      expect(logger.queuedCount).toBe(0);

      send.mockResolvedValue(true);
      logger.log("lifecycle.destroy");
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);
      expect(sentBodies().at(-1)).toMatchObject({ droppedCount: 1 });
    });

    it("resends the same clientEventIds on retry", async () => {
      send.mockResolvedValueOnce(false);
      const logger = createLogger();

      logger.log("lifecycle.mount");
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS + RETRY_DELAYS_MS[0]);

      const [failed, retried] = sentBodies();
      expect(retried.logs[0].clientEventId).toBe(failed.logs[0].clientEventId);
    });

    it("treats a rejected transport like a failed one", async () => {
      send.mockRejectedValueOnce(new Error("boom"));
      const logger = createLogger();

      logger.log("lifecycle.mount");
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS + RETRY_DELAYS_MS[0]);

      expect(send).toHaveBeenCalledTimes(2);
    });

    it("keeps the context until a batch with it is delivered", async () => {
      send.mockResolvedValueOnce(false);
      const logger = createLogger({ mode: "advanced" });

      logger.log("lifecycle.mount");
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS + RETRY_DELAYS_MS[0]);

      expect(sentBodies()[1]).toMatchObject({ context: { mode: "advanced" } });
    });
  });

  describe("unload flush", () => {
    it("hands everything to the beacon transport on pagehide", async () => {
      const logger = createLogger();
      logger.start();

      logMany(logger, 25);
      await vi.advanceTimersByTimeAsync(0);
      send.mockClear();
      logMany(logger, 3);
      window.dispatchEvent(new Event("pagehide"));

      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][2]).toEqual({ unloading: true });
      expect(logger.queuedCount).toBe(0);
      logger.stop();
    });

    it("flushes when the page becomes hidden, not when it becomes visible", () => {
      const logger = createLogger();
      logger.start();
      logger.log("lifecycle.mount");

      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      expect(send).not.toHaveBeenCalled();

      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      expect(send).toHaveBeenCalledWith(URL, expect.any(String), { unloading: true });

      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      logger.stop();
    });

    it("stop() sends what is queued, removes the listeners and ignores later logs", async () => {
      const add = vi.spyOn(window, "addEventListener");
      const remove = vi.spyOn(window, "removeEventListener");
      const removeDocument = vi.spyOn(document, "removeEventListener");
      const logger = createLogger();
      logger.start();
      logger.start();

      logger.log("lifecycle.destroy");
      logger.stop();
      logger.stop();

      expect(add.mock.calls.filter((x) => x[0] === "pagehide")).toHaveLength(1);
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][2]).toEqual({ unloading: true });
      expect(remove).toHaveBeenCalledWith("pagehide", expect.any(Function));
      expect(removeDocument).toHaveBeenCalledWith("visibilitychange", expect.any(Function));

      logger.log("lifecycle.mount");
      window.dispatchEvent(new Event("pagehide"));
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);
      expect(send).toHaveBeenCalledTimes(1);
    });
  });

  describe("never throws", () => {
    it("survives a transport that throws synchronously", async () => {
      send.mockImplementation(() => {
        throw new Error("sync");
      });
      const logger = createLogger();
      logger.start();

      expect(() => logMany(logger, MAX_BATCH_SIZE)).not.toThrow();
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);
      expect(() => window.dispatchEvent(new Event("pagehide"))).not.toThrow();
      expect(() => logger.stop()).not.toThrow();
    });

    it("survives a missing crypto.randomUUID", async () => {
      vi.stubGlobal("crypto", {});
      const logger = createLogger();

      expect(() => logger.log("lifecycle.mount")).not.toThrow();
      logger.log("lifecycle.destroy");
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);

      const ids = sentBodies()[0].logs.map((x) => x.clientEventId);
      expect(new Set(ids).size).toBe(2);
      expect(ids[0].length).toBeLessThanOrEqual(64);
      vi.unstubAllGlobals();
    });

    it("survives a context that cannot be serialized and drops that batch", async () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      const logger = new ComponentLogger(URL, { sessionId: "s" }, "v", circular as never);

      expect(() => logger.log("lifecycle.mount")).not.toThrow();
      await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS);
      expect(() => logger.stop()).not.toThrow();

      expect(send).not.toHaveBeenCalled();
    });

    it("survives unavailable timers", () => {
      vi.stubGlobal("setTimeout", () => {
        throw new Error("no timers");
      });
      const logger = createLogger();

      expect(() => logger.log("lifecycle.mount")).not.toThrow();
      vi.unstubAllGlobals();
    });
  });
});

describe("createComponentLogger", () => {
  const options = { url: URL, componentVersion: "v", identifier: { sessionId: "s" } };

  it("returns the no-op logger when logging is disabled", () => {
    expect(createComponentLogger({ ...options, enabled: false })).toBe(NOOP_LOGGER);
  });

  it("returns the no-op logger when the checkout cannot be identified", () => {
    expect(createComponentLogger({ ...options, enabled: true, identifier: null })).toBe(NOOP_LOGGER);
  });

  it("returns a real logger otherwise", () => {
    expect(createComponentLogger({ ...options, enabled: true })).toBeInstanceOf(ComponentLogger);
  });

  it("no-op logger methods do nothing", () => {
    expect(() => {
      NOOP_LOGGER.start();
      NOOP_LOGGER.log("lifecycle.mount");
      NOOP_LOGGER.stop();
    }).not.toThrow();
  });
});
