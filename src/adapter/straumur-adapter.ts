import { ICreateDetailsBody, ICreatePaymentBody, IGetPaymentMethodsBody, IPostDisableTokenBody } from "./models";
import { env } from "../env";
import { RequestTimeoutError } from "./request-timeout-error";

/**
 * Idempotent / side-effect-free calls (payment methods, disable token): long enough for a slow
 * network, short enough that a hung backend doesn't leave the shopper on a loader indefinitely.
 */
export const REQUEST_TIMEOUT_MS = 30_000;

/**
 * /payment and /details. Deliberately generous: these move money, and the backend may still
 * complete the attempt after we stop waiting — the timeout exists only so the widget can't stay
 * locked forever, and its outcome is reported as "not confirmed", never as "failed".
 */
export const PAYMENT_TIMEOUT_MS = 90_000;

function getBaseUrl(environment: "test" | "live"): string {
  switch (environment) {
    case "test":
      return env.STAGING_BASE_URL;
    case "live":
      return env.PRODUCTION_BASE_URL;
    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
}

// AbortController + setTimeout rather than AbortSignal.timeout(), which needs Safari 16+.
async function postJson(url: string, body: unknown, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new RequestTimeoutError(url, timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function getPaymentMethods(environment: "test" | "live", body: IGetPaymentMethodsBody) {
  return postJson(`${getBaseUrl(environment)}/${env.GET_PAYMENT_METHODS_URL}`, body, REQUEST_TIMEOUT_MS);
}

export function createPaymentRequest(environment: "test" | "live", body: ICreatePaymentBody) {
  return postJson(`${getBaseUrl(environment)}/${env.POST_PAYMENT_URL}`, body, PAYMENT_TIMEOUT_MS);
}

export function createDetailsRequest(environment: "test" | "live", body: ICreateDetailsBody) {
  return postJson(`${getBaseUrl(environment)}/${env.POST_DETAILS_URL}`, body, PAYMENT_TIMEOUT_MS);
}

export function postDisableTokenRequest(environment: "test" | "live", body: IPostDisableTokenBody) {
  return postJson(`${getBaseUrl(environment)}/${env.POST_DISABLE_TOKEN_URL}`, body, REQUEST_TIMEOUT_MS);
}
