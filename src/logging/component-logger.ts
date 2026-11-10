// Diagnostics logging for the widget: an in-memory queue sent to Checkout.Api in batches.
//
// Logging must never affect a payment. log() is synchronous, returns nothing and swallows every error;
// sending happens on timers, off the payment path; a failed batch is retried a few times and then dropped.
import { LogEventType, LogFields, LogFieldValue, LogCategory, sanitize } from "./log-events";
import { sendLogBatch } from "./log-transport";

export const MAX_BATCH_SIZE = 20;
export const FLUSH_DELAY_MS = 5_000;
export const MAX_QUEUE_SIZE = 500;
/** Delay before each retry of a failed batch; after the last one the batch is dropped. */
export const RETRY_DELAYS_MS = [2_000, 4_000, 8_000] as const;

export type LogIdentifier = { sessionId: string } | { checkoutReference: string };

export type LogEntry = {
  clientEventId: string;
  sequence: number;
  timestamp: string;
  category: LogCategory;
  type: LogEventType;
  paymentMethod?: string;
  data: Record<string, LogFieldValue>;
};

export type LogBatchBody = {
  sessionId?: string;
  checkoutReference?: string;
  componentVersion: string;
  context?: Record<string, LogFieldValue>;
  droppedCount?: number;
  logs: LogEntry[];
};

export interface Logger {
  /** Records one event. Synchronous, never throws; unknown types and fields are dropped. */
  log(type: LogEventType, fields?: LogFields): void;
  /** Starts flushing the queue when the page is hidden or closed. */
  start(): void;
  /** Sends what is queued, removes the page listeners and ignores later logs. */
  stop(): void;
}

/** Used when logging is disabled or the checkout cannot be identified. */
export const NOOP_LOGGER: Logger = {
  log() {},
  start() {},
  stop() {},
};

export type ComponentLoggerOptions = {
  enabled: boolean;
  url: string;
  identifier: LogIdentifier | null;
  componentVersion: string;
  /** Sent once with the first delivered batch. */
  context?: Record<string, LogFieldValue>;
};

export function createComponentLogger(options: ComponentLoggerOptions): Logger {
  if (!options.enabled || options.identifier === null) {
    return NOOP_LOGGER;
  }

  return new ComponentLogger(options.url, options.identifier, options.componentVersion, options.context);
}

type QueuedEntry = { entry: LogEntry; attempts: number };

export class ComponentLogger implements Logger {
  private queue: QueuedEntry[] = [];
  private sequence = 0;
  private idCounter = 0;
  private droppedCount = 0;
  private contextSent = false;
  private inFlight = false;
  private retryPending = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private listening = false;
  private stopped = false;

  constructor(
    private readonly url: string,
    private readonly identifier: LogIdentifier,
    private readonly componentVersion: string,
    private readonly context?: Record<string, LogFieldValue>
  ) {}

  /** Number of entries waiting to be sent (for tests and diagnostics). */
  get queuedCount(): number {
    return this.queue.length;
  }

  log(type: LogEventType, fields?: LogFields): void {
    try {
      if (this.stopped) {
        return;
      }

      const sanitized = sanitize(type, fields);

      if (!sanitized) {
        return;
      }

      const { paymentMethod, ...data } = sanitized.data;
      this.sequence += 1;

      const entry: LogEntry = {
        clientEventId: this.createId(),
        sequence: this.sequence,
        timestamp: new Date().toISOString(),
        category: sanitized.category,
        type,
        ...(typeof paymentMethod === "string" ? { paymentMethod } : {}),
        data,
      };

      this.queue.push({ entry, attempts: 0 });
      this.trimQueue();

      if (this.queue.length >= MAX_BATCH_SIZE && !this.retryPending) {
        this.flush();
      } else {
        this.scheduleFlush(FLUSH_DELAY_MS);
      }
    } catch {
      // Logging never breaks the widget.
    }
  }

  start(): void {
    try {
      if (this.listening || this.stopped || typeof window === "undefined") {
        return;
      }

      window.addEventListener("pagehide", this.handlePageHide);
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
      this.listening = true;
    } catch {
      // Without listeners, entries still go out on the batch timer.
    }
  }

  stop(): void {
    try {
      if (this.stopped) {
        return;
      }

      this.flushForUnload();
      this.removeListeners();
      this.clearFlushTimer();
      this.stopped = true;
    } catch {
      this.stopped = true;
    }
  }

  /** Sends the next batch unless one is already in flight. */
  flush(): void {
    try {
      if (this.inFlight || this.queue.length === 0) {
        return;
      }

      this.clearFlushTimer();
      this.retryPending = false;

      const batch = this.queue.splice(0, MAX_BATCH_SIZE);
      const reportedDropped = this.droppedCount;
      const includesContext = !this.contextSent && this.context !== undefined;
      let body: string;

      try {
        body = this.serialize(batch, reportedDropped, includesContext);
      } catch {
        this.droppedCount += batch.length;
        this.scheduleFlush(FLUSH_DELAY_MS);
        return;
      }

      this.inFlight = true;
      sendLogBatch(this.url, body, { unloading: false }).then(
        (delivered) => this.onBatchResult(batch, delivered, reportedDropped, includesContext),
        () => this.onBatchResult(batch, false, reportedDropped, includesContext)
      );
    } catch {
      this.inFlight = false;
    }
  }

  private onBatchResult(batch: QueuedEntry[], delivered: boolean, reportedDropped: number, includesContext: boolean) {
    try {
      this.inFlight = false;

      if (delivered) {
        this.droppedCount = Math.max(0, this.droppedCount - reportedDropped);
        this.contextSent = this.contextSent || includesContext;
        this.continueAfterDelivery();
        return;
      }

      const attempts = Math.max(...batch.map((x) => x.attempts)) + 1;

      if (attempts > RETRY_DELAYS_MS.length) {
        this.droppedCount += batch.length;
        this.continueAfterDelivery();
        return;
      }

      this.queue.unshift(...batch.map((x) => ({ entry: x.entry, attempts })));
      this.trimQueue();
      this.retryPending = true;
      this.scheduleFlush(RETRY_DELAYS_MS[attempts - 1], true);
    } catch {
      this.inFlight = false;
    }
  }

  private continueAfterDelivery() {
    if (this.stopped) {
      return;
    }

    if (this.queue.length >= MAX_BATCH_SIZE) {
      this.flush();
    } else if (this.queue.length > 0) {
      this.scheduleFlush(FLUSH_DELAY_MS);
    }
  }

  // Page hidden or closed: hand everything to the browser now (sendBeacon), without waiting for answers.
  private flushForUnload() {
    this.clearFlushTimer();
    this.retryPending = false;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, MAX_BATCH_SIZE);
      const includesContext = !this.contextSent && this.context !== undefined;

      try {
        const body = this.serialize(batch, this.droppedCount, includesContext);
        this.droppedCount = 0;
        this.contextSent = this.contextSent || includesContext;
        sendLogBatch(this.url, body, { unloading: true }).catch(() => {});
      } catch {
        this.droppedCount += batch.length;
      }
    }
  }

  private handlePageHide = () => {
    try {
      this.flushForUnload();
    } catch {
      // Logging never breaks the widget.
    }
  };

  private handleVisibilityChange = () => {
    try {
      if (document.visibilityState === "hidden") {
        this.flushForUnload();
      }
    } catch {
      // Logging never breaks the widget.
    }
  };

  private serialize(batch: QueuedEntry[], droppedCount: number, includesContext: boolean): string {
    const body: LogBatchBody = {
      ...this.identifier,
      componentVersion: this.componentVersion,
      ...(includesContext ? { context: this.context } : {}),
      ...(droppedCount > 0 ? { droppedCount } : {}),
      logs: batch.map((x) => x.entry),
    };

    return JSON.stringify(body);
  }

  // Bounded memory: when full, the oldest entries go and are reported in the next batch's droppedCount.
  private trimQueue() {
    const overflow = this.queue.length - MAX_QUEUE_SIZE;

    if (overflow > 0) {
      this.queue.splice(0, overflow);
      this.droppedCount += overflow;
    }
  }

  // A retry replaces a pending batch timer; a batch timer never shortens a pending retry.
  private scheduleFlush(delayMs: number, replace = false) {
    if (this.flushTimer !== null && !replace) {
      return;
    }

    this.clearFlushTimer();

    try {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        this.flush();
      }, delayMs);
    } catch {
      this.flushTimer = null;
    }
  }

  private clearFlushTimer() {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private removeListeners() {
    if (!this.listening) {
      return;
    }

    window.removeEventListener("pagehide", this.handlePageHide);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.listening = false;
  }

  private createId(): string {
    this.idCounter += 1;

    try {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }
    } catch {
      // Fall through to the non-cryptographic id: it only has to be unique per checkout.
    }

    return `${Date.now().toString(36)}-${this.idCounter}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
