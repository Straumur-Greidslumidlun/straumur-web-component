import { Logger } from "./component-logger";

type AdyenValidationItem = { fieldType?: string; error?: string };

/**
 * Adyen's onValidationError reports the whole error set on every change. This logs a field's error only
 * when it first appears or its code changes, so typing does not flood the log. The error code only
 * (e.g. "error.va.sf-cc-num.04"), never the localized text. One reporter per Adyen element.
 */
export function createFieldErrorReporter(
  logger: Logger,
  paymentMethod: string
): (items: readonly AdyenValidationItem[]) => void {
  let previous = new Map<string, string>();

  return (items) => {
    try {
      const current = new Map<string, string>();

      for (const item of items) {
        if (item.error && item.fieldType) {
          current.set(item.fieldType, item.error);
        }
      }

      for (const [field, errorCode] of current) {
        if (previous.get(field) !== errorCode) {
          logger.log("validation.fieldError", { paymentMethod, field, errorCode });
        }
      }

      previous = current;
    } catch {
      // Logging never breaks the widget.
    }
  };
}
