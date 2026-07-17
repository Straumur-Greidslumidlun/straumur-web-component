import { PaymentMethodOrder } from "../models/constants";

// Default top-to-bottom order, used when no custom order is given and to append any slots the caller
// omitted from a custom order (so an available method is never silently hidden just by being left out).
export const DEFAULT_PAYMENT_METHOD_ORDER: PaymentMethodOrder[] = [
  "instantpayments",
  "storedcard",
  "card",
  "googlepay",
  "applepay",
];

const VALID_TOKENS = new Set<string>(DEFAULT_PAYMENT_METHOD_ORDER);

/**
 * Resolves the render order for the payment-method slots. Unknown tokens are ignored, duplicates are
 * collapsed to their first occurrence, and any valid slot the caller omitted is appended in the
 * default order. A wallet listed in `instantPayments` still renders only inside the "instantpayments"
 * slot — its standalone component self-guards to null — so keeping its token here is harmless.
 */
export function resolvePaymentMethodOrder(order: readonly string[] | undefined): PaymentMethodOrder[] {
  if (!order) {
    return [...DEFAULT_PAYMENT_METHOD_ORDER];
  }

  const seen = new Set<PaymentMethodOrder>();
  const resolved: PaymentMethodOrder[] = [];

  for (const token of order) {
    if (VALID_TOKENS.has(token) && !seen.has(token as PaymentMethodOrder)) {
      seen.add(token as PaymentMethodOrder);
      resolved.push(token as PaymentMethodOrder);
    }
  }

  for (const token of DEFAULT_PAYMENT_METHOD_ORDER) {
    if (!seen.has(token)) {
      resolved.push(token);
    }
  }

  return resolved;
}
