import { ICreateDetailsBody, ICreatePaymentBody, IGetPaymentMethodsBody, IPostDisableTokenBody } from "./models";
import { env } from "../env";

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

export function getPaymentMethods(environment: "test" | "live", body: IGetPaymentMethodsBody) {
  return fetch(`${getBaseUrl(environment)}/${env.GET_PAYMENT_METHODS_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function createPaymentRequest(environment: "test" | "live", body: ICreatePaymentBody) {
  return fetch(`${getBaseUrl(environment)}/${env.POST_PAYMENT_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function createDetailsRequest(environment: "test" | "live", body: ICreateDetailsBody) {
  return fetch(`${getBaseUrl(environment)}/${env.POST_DETAILS_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function postDisableTokenRequest(environment: "test" | "live", body: IPostDisableTokenBody) {
  return fetch(`${getBaseUrl(environment)}/${env.POST_DISABLE_TOKEN_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
