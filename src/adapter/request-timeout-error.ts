// Own module (not straumur-adapter.ts) so tests that mock the adapter wholesale keep the real class.

/** Thrown when a Straumur API call gets no response within its timeout. */
export class RequestTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Straumur request timed out after ${timeoutMs}ms: ${url}`);
    this.name = "RequestTimeoutError";
  }
}
