// The catalog of every diagnostics event the widget may send, with an allow-list of fields per event.
// Anything not listed here never leaves the browser: unknown event types are dropped, unknown fields are
// dropped, and only primitive values are kept. This is the only place that decides what is collected, so
// card data, Adyen state/action payloads, tokens and shopper details can never reach the log by accident.

export type LogCategory = "lifecycle" | "ui" | "validation" | "payment" | "wallet" | "error";

export type LogFieldValue = string | number | boolean;

/** Fields passed to `logger.log()`. Values that are not string/number/boolean are dropped. */
export type LogFields = Record<string, unknown>;

type LogEventDefinition = { category: LogCategory; fields: readonly string[] };

export const LOG_EVENTS = {
  "lifecycle.mount": { category: "lifecycle", fields: [] },
  "lifecycle.methodsLoaded": { category: "lifecycle", fields: ["count", "methods"] },
  "lifecycle.mountFailed": { category: "lifecycle", fields: ["errorKey"] },
  "lifecycle.updateConfig": { category: "lifecycle", fields: ["keys"] },
  "lifecycle.setLanguage": { category: "lifecycle", fields: ["locale"] },
  "lifecycle.destroy": { category: "lifecycle", fields: [] },

  "ui.submitCardCalled": { category: "ui", fields: ["accepted"] },
  "ui.methodSelected": { category: "ui", fields: ["paymentMethod"] },
  "ui.payClicked": { category: "ui", fields: ["paymentMethod"] },
  "ui.enterPressed": { category: "ui", fields: ["paymentMethod"] },
  "ui.dualBrandSelected": { category: "ui", fields: ["brand"] },
  "ui.storeDetailsToggled": { category: "ui", fields: ["checked"] },
  "ui.storedCardSelected": { category: "ui", fields: [] },
  "ui.storedCardRemoved": { category: "ui", fields: ["success"] },
  "ui.tooltipOpened": { category: "ui", fields: ["id"] },

  "validation.cardValidityChanged": { category: "validation", fields: ["paymentMethod", "isValid"] },
  "validation.fieldError": { category: "validation", fields: ["paymentMethod", "field", "errorCode"] },

  "payment.beforeSubmit": { category: "payment", fields: ["paymentMethod", "allowed", "threw"] },
  "payment.submitBlocked": { category: "payment", fields: ["paymentMethod", "reason"] },
  "payment.submitted": { category: "payment", fields: ["paymentMethod"] },
  "payment.response": { category: "payment", fields: ["paymentMethod", "resultCode", "hasAction", "actionType"] },
  "payment.threeDSChallengeShown": { category: "payment", fields: ["paymentMethod", "componentType"] },
  "payment.detailsSubmitted": { category: "payment", fields: ["paymentMethod"] },
  "payment.timeout": { category: "payment", fields: ["paymentMethod", "stage"] },
  "payment.requestFailed": { category: "payment", fields: ["paymentMethod", "stage"] },
  "payment.redirectReturn": { category: "payment", fields: ["hasPaymentCheckoutReference"] },
  "payment.finalResult": {
    category: "payment",
    fields: ["paymentMethod", "resultCode", "screen", "hostCallbackThrew"],
  },

  "wallet.availability": { category: "wallet", fields: ["paymentMethod", "available"] },
  "wallet.clicked": { category: "wallet", fields: ["paymentMethod"] },
  "wallet.cancelled": { category: "wallet", fields: ["paymentMethod"] },
  "wallet.merchantValidation": { category: "wallet", fields: ["success"] },

  "error.adyen": { category: "error", fields: ["paymentMethod", "name", "stage"] },
  "error.init": { category: "error", fields: ["paymentMethod"] },
} as const satisfies Record<string, LogEventDefinition>;

export type LogEventType = keyof typeof LOG_EVENTS;

export const MAX_FIELD_LENGTH = 200;

export type SanitizedEvent = { category: LogCategory; data: Record<string, LogFieldValue> };

export function isLogEventType(type: string): type is LogEventType {
  return Object.prototype.hasOwnProperty.call(LOG_EVENTS, type);
}

/** Keeps only the allow-listed, primitive fields of a known event type; null for an unknown type. */
export function sanitize(type: string, fields?: LogFields): SanitizedEvent | null {
  if (!isLogEventType(type)) {
    return null;
  }

  const definition: LogEventDefinition = LOG_EVENTS[type];
  const data: Record<string, LogFieldValue> = {};

  for (const key of definition.fields) {
    const value = fields?.[key];

    if (typeof value === "string") {
      data[key] = value.slice(0, MAX_FIELD_LENGTH);
    } else if ((typeof value === "number" && Number.isFinite(value)) || typeof value === "boolean") {
      data[key] = value;
    }
  }

  return { category: definition.category, data };
}
