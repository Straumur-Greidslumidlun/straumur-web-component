// Sends one serialized log batch to Checkout.Api. Never throws and never rejects.
//
// The body is JSON labelled text/plain: the widget runs on the merchant's origin, and application/json would
// need a CORS preflight, which sendBeacon cannot do. Kept in its own module so tests can mock all logging
// network traffic in one place (test/setup.ts).

export const LOG_REQUEST_TIMEOUT_MS = 10_000;

const CONTENT_TYPE = "text/plain;charset=UTF-8";

export async function sendLogBatch(url: string, body: string, options: { unloading: boolean }): Promise<boolean> {
  try {
    // On page close a normal request is cancelled; the browser delivers a beacon after the page is gone.
    if (options.unloading && trySendBeacon(url, body)) {
      return true;
    }

    return await postWithFetch(url, body);
  } catch {
    return false;
  }
}

function trySendBeacon(url: string, body: string): boolean {
  try {
    if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
      return false;
    }

    return navigator.sendBeacon(url, new Blob([body], { type: CONTENT_TYPE }));
  } catch {
    return false;
  }
}

// AbortController + setTimeout rather than AbortSignal.timeout(), which needs Safari 16+.
async function postWithFetch(url: string, body: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOG_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": CONTENT_TYPE },
      body,
      keepalive: true,
      credentials: "omit",
      signal: controller.signal,
    });

    return response.ok;
  } finally {
    clearTimeout(timer);
  }
}
